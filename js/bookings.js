/**
 * KALTO LAW - Consultation Booking System
 * Handles firestore-backed appointment scheduling
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize booking buttons site-wide
    initBookingButtons();
});

function initBookingButtons() {
    // Disabled to allow standard HTML anchor links to work.
}

async function showBookingModal() {
    // Create the booking form HTML
    const formHtml = `
        <div class="booking-form-v2">
            <div class="form-group">
                <label><i class="fa-solid fa-user"></i> Full Name</label>
                <input type="text" id="book-name" placeholder="Enter your full name" required>
            </div>
            <div class="form-group">
                <label><i class="fa-solid fa-envelope"></i> Email Address</label>
                <input type="email" id="book-email" placeholder="email@example.com" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label><i class="fa-solid fa-calendar-day"></i> Preferred Date</label>
                    <input type="date" id="book-date" min="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label><i class="fa-solid fa-clock"></i> Preferred Time</label>
                    <select id="book-time" required>
                        <option value="">Select Time</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label><i class="fa-solid fa-gavel"></i> Legal Service</label>
                <select id="book-service">
                    <option value="Corporate Law">Corporate Law</option>
                    <option value="Family Law">Family Law</option>
                    <option value="Real Estate">Real Estate & Planning</option>
                    <option value="Tax Law">Tax Law</option>
                    <option value="ADR">Dispute Resolution (ADR)</option>
                    <option value="General Consultation">General Consultation</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fa-solid fa-comment-dots"></i> Brief Message (Optional)</label>
                <textarea id="book-message" placeholder="Briefly describe your case..."></textarea>
            </div>
        </div>
    `;

    // Use the existing custom modal system if available, else standard
    if (typeof showCustomPrompt === 'function') {
        const confirmed = await showCustomPrompt({
            title: "Book Professional Consultation",
            html: formHtml,
            confirmText: "Request Appointment",
            cancelText: "Cancel",
            icon: "fa-calendar-check"
        });

        if (confirmed) {
            submitBooking();
        }
    } else {
        // Fallback or manual modal implementation
        console.warn("Custom modal system not found in main.js. Using basic implementation.");
        // We'll implement a temporary overlay if main.js is not loaded
    }
}

async function submitBooking() {
    const name = document.getElementById('book-name').value;
    const email = document.getElementById('book-email').value;
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    const service = document.getElementById('book-service').value;
    const message = document.getElementById('book-message').value;

    if (!name || !email || !date || !time) {
        if (typeof showToast === 'function') showToast("Please fill in all required fields", "error");
        return;
    }

    try {
        if (typeof showToast === 'function') showToast("Scheduling your consultation...", "info");

        // Generate a unique document tracking number
        const docNumber = 'KALTO-' + Math.floor(100000 + Math.random() * 900000);

        // Reference db from firebase-config.js
        await db.collection('appointments').doc(docNumber).set({
            name,
            email,
            date,
            time,
            service,
            message,
            docNumber,
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Send Automated Email via EmailJS REST API
        try {
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: 'YOUR_SERVICE_ID', // Replace with EmailJS Service ID
                    template_id: 'YOUR_TEMPLATE_ID', // Replace with EmailJS Template ID
                    user_id: 'YOUR_PUBLIC_KEY', // Replace with EmailJS Public Key
                    template_params: {
                        'client_name': name,
                        'client_email': email,
                        'doc_number': docNumber,
                        'service_requested': service,
                        'appointment_date': date,
                        'appointment_time': time
                    }
                })
            });
            console.log("Automated email triggered successfully.");
        } catch (emailErr) {
            console.warn("Automated email failed to send (ensure API keys are configured):", emailErr);
        }

        const successMsg = `Consultation requested successfully! Your tracking number is: ${docNumber}. Please save it for your records.`;
        if (typeof showToast === 'function') {
            showToast(successMsg, "success");
            // Show alert as well so they can easily see and copy the number before it fades
            setTimeout(() => alert(successMsg), 500);
        } else {
            alert(successMsg);
        }

    } catch (error) {
        console.error("Booking Error:", error);
        if (typeof showToast === 'function') showToast("Failed to book consultation. Please try again.", "error");
    }
}
