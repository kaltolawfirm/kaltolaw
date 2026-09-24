const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin SDK
admin.initializeApp();

// ─── Security Hardening ───────────────────────────────────────────────────────

/**
 * In-memory rate limiter (resets on cold start — suitable for most abuse scenarios).
 * Maps documentId → { count, firstSeen }
 * Limit: MAX_EVENTS per WINDOW_MS per unique Firestore document path.
 */
const _rateLimitStore = new Map();
const RATE_LIMIT_MAX    = 3;   // max triggers per document in window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function isRateLimited(docId) {
    const now = Date.now();
    const entry = _rateLimitStore.get(docId);

    if (!entry || (now - entry.firstSeen) > RATE_LIMIT_WINDOW) {
        _rateLimitStore.set(docId, { count: 1, firstSeen: now });
        return false;
    }
    if (entry.count >= RATE_LIMIT_MAX) {
        console.warn(`[SECURITY] Rate limit hit for doc: ${docId}`);
        return true;
    }
    entry.count++;
    return false;
}

/**
 * Strip HTML tags and dangerous characters from user-supplied strings.
 * Prevents XSS content being forwarded in emails.
 */
function sanitize(str, maxLen = 1000) {
    if (typeof str !== "string") return "";
    return str
        .replace(/<[^>]*>/g, "")         // strip HTML tags
        .replace(/[&<>"'`]/g, "")        // strip special chars
        .replace(/\s+/g, " ")            // collapse whitespace
        .trim()
        .slice(0, maxLen);
}

/**
 * Validate that required fields are present and non-empty.
 * Returns { valid: boolean, error: string|null }
 */
function validateFields(data, requiredFields) {
    for (const field of requiredFields) {
        if (!data[field] || String(data[field]).trim() === "") {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }
    return { valid: true, error: null };
}

/**
 * Validate email format.
 */
function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Master guard — call at the top of each function handler.
 * Returns true if the event should be SKIPPED (rate limited or invalid).
 */
function shouldSkip(docId, data, requiredFields = []) {
    if (isRateLimited(docId)) return true;

    if (requiredFields.length > 0) {
        const { valid, error } = validateFields(data, requiredFields);
        if (!valid) {
            console.warn(`[SECURITY] Validation failed for ${docId}: ${error}`);
            return true;
        }
    }
    return false;
}


// Credentials are loaded from functions/.env automatically by Firebase CLI.
// Set: GMAIL_EMAIL, GMAIL_APP_PASSWORD, ADMIN_EMAIL, ADMIN_NAME in functions/.env
// See: https://firebase.google.com/docs/functions/config-env#env-variables
function createTransporter() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

// ─── Branded HTML Email Builder ───────────────────────────────────────────────
function buildEmailHtml({ title, greeting, bodyLines, ctaLabel, ctaUrl, footerNote }) {
    const cta = ctaLabel && ctaUrl
        ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#c5a059;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${ctaLabel}</a>`
        : "";
    const bodyHtml = bodyLines.map(line => `<p style="margin:0 0 12px;color:#344054;font-size:15px;line-height:1.6;">${line}</p>`).join("\n");

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d1b35 0%,#1a3060 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:#c5a059;">⚖ KALTO LAW</div>
            <div style="font-size:12px;color:#8fa3cc;margin-top:4px;letter-spacing:3px;text-transform:uppercase;">Legal Excellence</div>
          </td>
        </tr>

        <!-- Title Bar -->
        <tr>
          <td style="background:#c5a059;padding:14px 40px;">
            <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;">${title}</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#0d1b35;">${greeting}</p>
            ${bodyHtml}
            ${cta}
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e4e7ec;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#98a2b3;">
              ${footerNote || "This is an automated notification from the Kalto Law Client Portal."}<br>
              Kalto Law Firm &bull; Kigali, Rwanda &bull; <a href="https://kalto-law.web.app" style="color:#c5a059;text-decoration:none;">kalto-law.web.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Helper: Get config values safely ────────────────────────────────────────
function getAdminEmail() {
    return process.env.ADMIN_EMAIL || "";
}
function getFromEmail() {
    return process.env.GMAIL_EMAIL || "";
}

// ─── FUNCTION 1: Admin Alert — New "Ask a Lawyer" Message ─────────────────────
exports.notifyOnNewMessage = functions.firestore
    .document("messages/{msgId}")
    .onCreate(async (snap, context) => {
        const msg    = snap.data();
        const docId  = context.params.msgId;

        // ── Security guard ──────────────────────────────────────────────────
        if (shouldSkip(docId, msg, ["question"])) return null;
        const clientName  = sanitize(msg.clientName || "Client", 120);
        const question    = sanitize(msg.question   || "", 2000);
        const clientEmail = msg.email && isValidEmail(msg.email) ? msg.email.trim() : null;

        const adminEmail = getAdminEmail();
        const fromEmail  = getFromEmail();
        if (!adminEmail || !fromEmail) {
            console.warn("Email config not set. Skipping.");
            return null;
        }
        const transporter = createTransporter();

        // 1a. Email to ADMIN
        const adminHtml = buildEmailHtml({
            title: "New Client Message — Action Required",
            greeting: `New message from ${clientName}`,
            bodyLines: [
                `<strong>Client:</strong> ${clientName}`,
                `<strong>Email:</strong> ${clientEmail || "Not provided"}`,
                `<strong>Received:</strong> ${new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali" })}`,
                `<hr style="border:none;border-top:1px solid #e4e7ec;margin:16px 0;">`,
                `<strong>Message:</strong>`,
                `<div style="background:#f9fafb;border-left:4px solid #c5a059;padding:16px;border-radius:0 8px 8px 0;margin-top:8px;font-style:italic;color:#344054;">${question}</div>`,
            ],
            ctaLabel: "Open Admin Dashboard →",
            ctaUrl: "https://kalto-law.web.app/admin.html",
            footerNote: "Log in to the admin dashboard to view and reply to this message.",
        });
        await transporter.sendMail({
            from: `"Kalto Law Portal" <${fromEmail}>`,
            to: adminEmail,
            subject: `⚖ New Client Message from ${clientName} — Kalto Law`,
            html: adminHtml,
        });
        console.log(`[FUNC1] Admin notification sent to ${adminEmail}`);

        // 1b. Confirmation email to CLIENT
        if (clientEmail) {
            const clientHtml = buildEmailHtml({
                title: "We Received Your Message",
                greeting: `Dear ${clientName},`,
                bodyLines: [
                    "Thank you for reaching out to <strong>Kalto Law Firm</strong>.",
                    "We have received your message and a member of our legal team will respond within <strong>24 hours</strong> (business days).",
                    `<hr style="border:none;border-top:1px solid #e4e7ec;margin:16px 0;">`,
                    `<strong>Your message:</strong>`,
                    `<div style="background:#f9fafb;border-left:4px solid #c5a059;padding:16px;border-radius:0 8px 8px 0;margin-top:8px;font-style:italic;color:#344054;">${question}</div>`,
                    `<br>Log in to your portal to track the status and view our reply.`,
                ],
                ctaLabel: "View My Portal →",
                ctaUrl: "https://kalto-law.web.app/portal.html",
                footerNote: "If you did not send this message, please contact us immediately.",
            });
            await transporter.sendMail({
                from: `"Kalto Law Firm" <${fromEmail}>`,
                to: clientEmail,
                subject: "✅ Your Message to Kalto Law Has Been Received",
                html: clientHtml,
            });
            console.log(`[FUNC1] Client confirmation sent to ${clientEmail}`);
        }
        return null;
    });



// ─── FUNCTION 2: Admin Alert — Admin Replies to a Message ────────────────────
exports.notifyClientOnAdminReply = functions.firestore
    .document("messages/{msgId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after  = change.after.data();
        const docId  = context.params.msgId;

        // Only fire when adminReply is newly added
        if (!after.adminReply || before.adminReply === after.adminReply) return null;

        // ── Security guard ────────────────────────────────────────────────
        if (isRateLimited(docId + "_reply")) return null;
        const clientEmail = after.email && isValidEmail(after.email) ? after.email.trim() : null;
        const clientName  = sanitize(after.clientName || "Valued Client", 120);
        const question    = sanitize(after.question   || "", 2000);
        const adminReply  = sanitize(after.adminReply || "", 2000);

        const fromEmail = getFromEmail();
        if (!clientEmail || !fromEmail) {
            console.warn("[FUNC2] Missing client email or Gmail config.");
            return null;
        }
        const transporter = createTransporter();

        const clientHtml = buildEmailHtml({
            title: "You Have a Reply from Our Legal Team",
            greeting: `Dear ${clientName},`,
            bodyLines: [
                "Great news! A member of our legal team has replied to your message.",
                `<strong>Your original question:</strong>`,
                `<div style="background:#f9fafb;border-left:4px solid #e4e7ec;padding:14px;border-radius:0 8px 8px 0;margin-top:8px;font-style:italic;color:#667085;">${question}</div>`,
                `<br><strong>Our reply:</strong>`,
                `<div style="background:#f0f7ef;border-left:4px solid #12b76a;padding:14px;border-radius:0 8px 8px 0;margin-top:8px;color:#0d1b35;font-weight:500;">${adminReply}</div>`,
                `<br>Log in to your portal to view the full conversation.`,
            ],
            ctaLabel: "View Full Conversation →",
            ctaUrl: "https://kalto-law.web.app/portal.html",
            footerNote: "This is a reply notification from Kalto Law Firm.",
        });
        await transporter.sendMail({
            from: `"Kalto Law Firm" <${fromEmail}>`,
            to: clientEmail,
            subject: "💬 Kalto Law Has Replied to Your Message",
            html: clientHtml,
        });
        console.log(`[FUNC2] Reply notification sent to ${clientEmail}`);
        return null;
    });

// ─── FUNCTION 3: Admin Alert — New Booking Request ───────────────────────────
exports.notifyOnNewBooking = functions.firestore
    .document("appointments/{bookingId}")
    .onCreate(async (snap, context) => {
        const booking = snap.data();
        const docId   = context.params.bookingId;

        // ── Security guard ────────────────────────────────────────────────
        if (shouldSkip(docId, booking, ["name", "service", "date"])) return null;
        const name    = sanitize(booking.name    || "Client", 120);
        const service = sanitize(booking.service || "", 200);
        const date    = sanitize(booking.date    || "", 50);
        const time    = sanitize(booking.time    || "", 50);
        const notes   = sanitize(booking.notes   || "No notes provided.", 500);
        const bookEmail = booking.email && isValidEmail(booking.email) ? booking.email.trim() : null;

        const adminEmail = getAdminEmail();
        const fromEmail  = getFromEmail();

        if (!adminEmail || !fromEmail) {
            console.warn("Email config not set. Skipping booking notification.");
            return null;
        }

        const transporter = createTransporter();

        // Admin alert
        const adminHtml = buildEmailHtml({
            title: "New Consultation Booking Request",
            greeting: `Booking Request from ${booking.name || "a client"}`,
            bodyLines: [
                `<strong>Client:</strong> ${booking.name || "Unknown"}`,
                `<strong>Email:</strong> ${booking.email || "Not provided"}`,
                `<strong>Phone:</strong> ${booking.phone || "Not provided"}`,
                `<strong>Service:</strong> ${booking.service || "General Consultation"}`,
                `<strong>Preferred Date:</strong> ${booking.date || "Not specified"}`,
                `<strong>Preferred Time:</strong> ${booking.time || "Not specified"}`,
                booking.notes ? `<strong>Notes:</strong> ${booking.notes}` : "",
            ].filter(Boolean),
            ctaLabel: "Manage Bookings →",
            ctaUrl: "https://kalto-law.web.app/admin.html",
            footerNote: "Confirm or reschedule via the admin dashboard.",
        });

        await transporter.sendMail({
            from: `"Kalto Law Portal" <${fromEmail}>`,
            to: adminEmail,
            subject: `📅 New Booking: ${booking.service || "Consultation"} — ${booking.name || "Client"}`,
            html: adminHtml,
        });

        // Client confirmation
        if (booking.email) {
            const clientHtml = buildEmailHtml({
                title: "Booking Request Received",
                greeting: `Dear ${booking.name || "Valued Client"},`,
                bodyLines: [
                    "Your consultation request has been received by <strong>Kalto Law Firm</strong>.",
                    "Our team will confirm your booking within <strong>24 hours</strong>. You will receive a follow-up email once your appointment is confirmed.",
                    `<strong>Booking Summary:</strong>`,
                    `<div style="background:#f9fafb;padding:16px;border-radius:8px;margin-top:8px;">
                        <p style="margin:0 0 8px"><strong>Service:</strong> ${booking.service || "General Consultation"}</p>
                        <p style="margin:0 0 8px"><strong>Date:</strong> ${booking.date || "TBD"}</p>
                        <p style="margin:0"><strong>Time:</strong> ${booking.time || "TBD"}</p>
                    </div>`,
                ],
                ctaLabel: "View My Portal →",
                ctaUrl: "https://kalto-law.web.app/portal.html",
            });

            await transporter.sendMail({
                from: `"Kalto Law Firm" <${fromEmail}>`,
                to: booking.email,
                subject: "✅ Consultation Booking Request Confirmed — Kalto Law",
                html: clientHtml,
            });
        }

        return null;
    });

// ─── FUNCTION 4: Admin Alert — New General Enquiry ───────────────────────────
exports.notifyAdminOnNewEnquiry = functions.firestore
    .document("enquiries/{enquiryId}")
    .onCreate(async (snap, context) => {
        const enquiry    = snap.data();
        const adminEmail = getAdminEmail();
        const fromEmail  = getFromEmail();

        if (!adminEmail || !fromEmail) {
            console.warn("Email config not set. Skipping enquiry notification.");
            return null;
        }

        const transporter = createTransporter();

        const adminHtml = buildEmailHtml({
            title: "New Website Enquiry",
            greeting: `New enquiry from ${enquiry.name || "a visitor"}`,
            bodyLines: [
                `<strong>Name:</strong> ${enquiry.name || "Not provided"}`,
                `<strong>Email:</strong> ${enquiry.email || "Not provided"}`,
                `<strong>Phone:</strong> ${enquiry.phone || "Not provided"}`,
                `<strong>Subject:</strong> ${enquiry.subject || "General Enquiry"}`,
                `<hr style="border:none;border-top:1px solid #e4e7ec;margin:16px 0;">`,
                `<strong>Message:</strong>`,
                `<div style="background:#f9fafb;border-left:4px solid #c5a059;padding:16px;border-radius:0 8px 8px 0;margin-top:8px;font-style:italic;color:#344054;">"${enquiry.message || enquiry.details || "No message provided"}"</div>`,
            ],
            ctaLabel: "View Admin Dashboard →",
            ctaUrl: "https://kalto-law.web.app/admin.html",
        });

        await transporter.sendMail({
            from: `"Kalto Law Portal" <${fromEmail}>`,
            to: adminEmail,
            subject: `📬 New Enquiry from ${enquiry.name || "Website Visitor"} — Kalto Law`,
            html: adminHtml,
        });

        console.log(`Enquiry notification sent to ${adminEmail}`);
        return null;
    });

// ─── FUNCTION 5: Client Alert — Case Status Update ───────────────────────────
exports.notifyClientOnCaseUpdate = functions.firestore
    .document("cases/{caseId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const oldValue = change.before.data();

        if (newValue.status === oldValue.status) return null;

        const clientEmail = newValue.email;
        const fromEmail   = getFromEmail();

        if (!clientEmail || !fromEmail) {
            console.log("No client email or Gmail config. Skipping case update email.");
            return null;
        }

        const transporter = createTransporter();

        const statusColors = {
            "Active":   "#12b76a",
            "Pending":  "#f79009",
            "Closed":   "#667085",
            "On Hold":  "#d92d20",
        };
        const color = statusColors[newValue.status] || "#c5a059";

        const clientHtml = buildEmailHtml({
            title: "Case Status Update",
            greeting: `Dear ${newValue.clientName || "Valued Client"},`,
            bodyLines: [
                `Your case has been updated by our legal team.`,
                `<strong>Case Reference:</strong> <code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-weight:700">${newValue.trackingCode || "N/A"}</code>`,
                `<strong>Matter:</strong> ${newValue.description || newValue.caseName || "Legal Matter"}`,
                `<strong>New Status:</strong> <span style="background:${color}20;color:${color};padding:4px 12px;border-radius:20px;font-weight:700;font-size:13px;">${newValue.status}</span>`,
                `<br>Log in to your portal to view full case details and any attached documents.`,
            ],
            ctaLabel: "View My Cases →",
            ctaUrl: "https://kalto-law.web.app/portal.html",
        });

        await transporter.sendMail({
            from: `"Kalto Law Firm" <${fromEmail}>`,
            to: clientEmail,
            subject: `🔔 Case Update: ${newValue.trackingCode || "Your Case"} is now ${newValue.status} — Kalto Law`,
            html: clientHtml,
        });

        console.log(`Case update email sent to ${clientEmail}`);
        return null;
    });

// ─── FUNCTION 6: Payment Receipt — Invoice Marked Paid ───────────────────────
exports.notifyOnInvoicePaid = functions.firestore
    .document("invoices/{invoiceId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after  = change.after.data();

        // Only fire when status changes to 'paid'
        if (before.status === "paid" || after.status !== "paid") {
            return null;
        }

        const clientEmail = after.email;
        const adminEmail  = getAdminEmail();
        const fromEmail   = getFromEmail();

        if (!fromEmail) {
            console.warn("Gmail config not set. Skipping payment receipt.");
            return null;
        }

        const transporter = createTransporter();
        const amount = Number(after.amount || 0).toLocaleString();
        const paidDate = new Date().toLocaleString("en-RW", { timeZone: "Africa/Kigali", dateStyle: "full", timeStyle: "short" });

        // ── Receipt to client ──────────────────────────────────────────────
        if (clientEmail) {
            const clientHtml = buildEmailHtml({
                title: "Payment Receipt — Invoice Settled",
                greeting: `Dear ${after.clientName || "Valued Client"},`,
                bodyLines: [
                    "Thank you! Your payment has been successfully received and your invoice is now <strong>fully settled</strong>.",
                    `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0;">
                        <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#166534;font-weight:700;">PAYMENT RECEIPT</p>
                        <p style="margin:0 0 6px"><strong>Invoice No:</strong> ${after.invoiceId}</p>
                        <p style="margin:0 0 6px"><strong>Description:</strong> ${after.description || "Legal Services"}</p>
                        <p style="margin:0 0 6px"><strong>Amount Paid:</strong> <span style="color:#166534;font-weight:700;font-size:1.1em;">RWF ${amount}</span></p>
                        <p style="margin:0 0 6px"><strong>Payment Method:</strong> ${after.paymentMethod || "Online"}</p>
                        <p style="margin:0;color:#667085;font-size:0.85em;"><strong>Date:</strong> ${paidDate}</p>
                    </div>`,
                    "Please keep this email as your proof of payment. If you have any questions, log in to your client portal or contact our office.",
                ],
                ctaLabel: "View My Portal →",
                ctaUrl: "https://kalto-law.web.app/portal.html",
                footerNote: "This is an official payment receipt from Kalto Law Firm.",
            });

            await transporter.sendMail({
                from: `"Kalto Law Firm" <${fromEmail}>`,
                to: clientEmail,
                subject: `✅ Payment Receipt — Invoice ${after.invoiceId} — Kalto Law`,
                html: clientHtml,
            });
            console.log(`Payment receipt sent to ${clientEmail}`);
        }

        // ── Alert to admin ─────────────────────────────────────────────────
        if (adminEmail) {
            const adminHtml = buildEmailHtml({
                title: "Invoice Paid — Payment Confirmed",
                greeting: `Payment received for Invoice ${after.invoiceId}`,
                bodyLines: [
                    `<strong>Client:</strong> ${after.clientName || "Unknown"}`,
                    `<strong>Amount:</strong> RWF ${amount}`,
                    `<strong>Method:</strong> ${after.paymentMethod || "Online"}`,
                    after.flwTransactionId ? `<strong>Transaction ID:</strong> <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">${after.flwTransactionId}</code>` : "",
                    `<strong>Date:</strong> ${paidDate}`,
                ].filter(Boolean),
                ctaLabel: "View Invoices in Dashboard →",
                ctaUrl: "https://kalto-law.web.app/admin.html",
                footerNote: "This is an automated payment alert from the Kalto Law billing system.",
            });

            await transporter.sendMail({
                from: `"Kalto Law Portal" <${fromEmail}>`,
                to: adminEmail,
                subject: `💰 Payment Received: RWF ${amount} — ${after.invoiceId}`,
                html: adminHtml,
            });
            console.log(`Payment alert sent to admin ${adminEmail}`);
        }

        return null;
    });

// ─── FUNCTION 7: Callable — Send Email Campaign ───────────────────────────────
exports.sendEmailCampaign = functions.https.onCall(async (data, context) => {

    // ── Auth guard: only authenticated admins ──────────────────────────────
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be signed in to send campaigns.");
    }

    // ── Rate limit: max 5 campaign sends per admin per minute ──────────────
    const callerId = context.auth.uid;
    if (isRateLimited(callerId + "_campaign")) {
        throw new functions.https.HttpsError("resource-exhausted", "Too many requests. Please wait before sending another campaign.");
    }

    // ── Validate input ─────────────────────────────────────────────────────
    const { subject, bodyHTML, audience, recipients } = data;
    if (!subject || typeof subject !== "string" || subject.trim().length < 2) {
        throw new functions.https.HttpsError("invalid-argument", "A valid email subject is required.");
    }
    if (!bodyHTML || typeof bodyHTML !== "string" || bodyHTML.trim().length < 10) {
        throw new functions.https.HttpsError("invalid-argument", "Email body is required and must be at least 10 characters.");
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "No recipients provided.");
    }
    if (recipients.length > 1000) {
        throw new functions.https.HttpsError("invalid-argument", "Max 1000 recipients per campaign.");
    }

    const cleanSubject = sanitize(subject, 200);
    const fromEmail    = getFromEmail();
    const adminName    = process.env.ADMIN_NAME || "Kalto Law";

    if (!fromEmail) {
        throw new functions.https.HttpsError("failed-precondition", "Email configuration not set. Please configure GMAIL_EMAIL in environment.");
    }

    // ── Build branded campaign HTML ────────────────────────────────────────
    function buildCampaignHtml(recipientEmail, name) {
        const personalizedBody = bodyHTML.replace(/\{\{name\}\}/g, name || "Valued Client");
        return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#0d1b35 0%,#1a3060 100%);padding:28px 36px;text-align:center;">
          <div style="font-size:20px;font-weight:800;letter-spacing:2px;color:#c5a059;">⚖ KALTO LAW</div>
          <div style="font-size:11px;color:#8fa3cc;margin-top:4px;letter-spacing:3px;text-transform:uppercase;">Legal Excellence</div>
        </td></tr>
        <tr><td style="background:#c5a059;padding:12px 36px;">
          <span style="font-size:12px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;">${cleanSubject}</span>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.7;color:#344054;">${personalizedBody}</div>
        </td></tr>
        <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e4e7ec;"></td></tr>
        <tr><td style="padding:20px 36px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#98a2b3;">
            You are receiving this because you subscribed to Kalto Law updates.<br>
            <a href="https://kalto-law.web.app" style="color:#c5a059;text-decoration:none;">kalto-law.web.app</a>
            &nbsp;·&nbsp; Kigali, Rwanda
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    // ── Send in batches of 50 (Gmail safe limit) ───────────────────────────
    const transporter = createTransporter();
    const BATCH_SIZE  = 50;
    let sent = 0, failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(async (email) => {
            try {
                if (!isValidEmail(email)) { failed++; return; }
                const html = buildCampaignHtml(email, "");
                await transporter.sendMail({
                    from: `"${adminName}" <${fromEmail}>`,
                    to: email,
                    subject: cleanSubject,
                    html,
                });
                sent++;
            } catch (e) {
                console.error(`[CAMPAIGN] Failed to send to ${email}:`, e.message);
                failed++;
            }
        }));
    }

    console.log(`[CAMPAIGN] Done — Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
    return { success: true, sent, failed, total: recipients.length };
});
