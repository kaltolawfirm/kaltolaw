document.addEventListener('DOMContentLoaded', () => {
    const trackBtn = document.getElementById('trackBtn');
    const trackingCodeInput = document.getElementById('trackingCode');
    const trackError = document.getElementById('trackError');
    const searchView = document.getElementById('searchView');
    const statusView = document.getElementById('statusView');

    // UI elements for display
    const displayClientName = document.getElementById('displayClientName');
    const displayCode = document.getElementById('displayCode');
    const statusBadge = document.getElementById('statusBadge');
    const displayDescription = document.getElementById('displayDescription');
    const documentList = document.getElementById('documentList');

    if (trackBtn) {
        trackBtn.addEventListener('click', async () => {
            const code = trackingCodeInput.value.trim().toUpperCase();
            if (!code) {
                showError("Please enter a tracking code.");
                return;
            }

            trackBtn.disabled = true;
            trackBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Securing Data...';
            trackError.style.display = 'none';

            try {
                // 1. Search in cases
                let docSnap = await db.collection("cases").doc(code).get();
                let caseData = null;

                if (docSnap.exists) {
                    caseData = docSnap.data();
                } else {
                    // 2. Search by trackingCode field (primary method)
                    const caseQ = await db.collection("cases").where("trackingCode", "==", code).limit(1).get();
                    if (!caseQ.empty) {
                        caseData = caseQ.docs[0].data();
                    } else {
                        // 3. Search in appointments
                        let apptSnap = await db.collection("appointments").doc(code).get();
                        if (apptSnap.exists) {
                            const appt = apptSnap.data();
                            let mappedStatus = 'initiated';
                            const origStatus = (appt.status || '').toLowerCase();
                            if (origStatus === 'confirmed') mappedStatus = 'approved';
                            if (origStatus === 'completed') mappedStatus = 'closed';

                            caseData = {
                                clientName: appt.name || appt.clientName || 'Client',
                                description: `Consultation Booking: ${appt.service || 'General'}`,
                                status: mappedStatus,
                                documents: []
                            };
                        } else {
                            // 4. Search in enquiries
                            let enqSnap = await db.collection("enquiries").doc(code).get();
                            if (enqSnap.exists) {
                                const enq = enqSnap.data();
                                let mappedStatus = 'initiated';
                                const origStatus = (enq.status || '').toLowerCase();
                                if (origStatus === 'read') mappedStatus = 'review';
                                if (origStatus === 'replied') mappedStatus = 'approved';
                                if (origStatus === 'closed') mappedStatus = 'closed';

                                caseData = {
                                    clientName: enq.name || enq.clientName || 'Client',
                                    description: `General Enquiry: ${enq.service || 'Contact Form'}`,
                                    status: mappedStatus,
                                    documents: []
                                };
                            }
                        }
                    }
                }

                if (!caseData) {
                    showError("Invalid tracking code. Please check and try again.");
                } else {
                    renderCaseStatus(caseData, code);
                }
            } catch (error) {
                console.error("Tracking Error:", error);
                showError("A connection error occurred. Please try again later.");
            } finally {
                trackBtn.disabled = false;
                trackBtn.innerHTML = 'Track Case';
            }
        });
    }

    function showError(msg) {
        trackError.textContent = msg;
        trackError.style.display = 'block';
    }

    function renderCaseStatus(data, code) {
        searchView.style.display = 'none';
        statusView.style.display = 'block';

        displayClientName.textContent = data.clientName || "Confidential Client";
        displayCode.textContent = code;
        displayDescription.textContent = data.description || "No description provided for this case.";

        // Status Badge Logic
        const status = (data.status || 'processing').toLowerCase();
        statusBadge.textContent = data.status || 'Processing';
        statusBadge.className = `status-badge-large status-${status}`;

        // Progress Tracker Logic
        const steps = ['initiated', 'review', 'approved', 'closed'];
        const currentStepIndex = steps.indexOf(status);
        
        // Reset steps
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'completed'));
        
        if (status === 'rejected') {
            statusBadge.className = 'status-badge-large status-rejected';
            statusBadge.textContent = 'Rejected';
        }

        for (let i = 0; i < steps.length; i++) {
            const stepEl = document.getElementById(`step${i + 1}`);
            if (!stepEl) continue;
            if (i < currentStepIndex) {
                stepEl.classList.add('completed');
            } else if (i === currentStepIndex) {
                stepEl.classList.add('active');
            }
        }

        // Documents
        documentList.innerHTML = '';
        if (data.documents && data.documents.length > 0) {
            data.documents.forEach(doc => {
                const item = document.createElement('div');
                item.className = 'doc-item';
                item.innerHTML = `
                    <div class="doc-info">
                        <i class="fa-solid fa-file-pdf doc-icon"></i>
                        <span style="font-weight: 600;">${doc.name}</span>
                    </div>
                    <a href="${doc.url}" target="_blank" class="btn btn-primary" style="padding: 8px 15px; font-size: 0.8rem;">
                        <i class="fa-solid fa-download"></i> Download
                    </a>
                `;
                documentList.appendChild(item);
            });
        } else {
            documentList.innerHTML = '<p class="text-muted">No documents available for this case yet.</p>';
        }

        // ── Invoice / Billing Section ─────────────────────────────────────
        loadCaseInvoices(code);

        // Upload Logic
        const uploadForm = document.getElementById('uploadForm');
        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const uploadStatus = document.getElementById('uploadStatus');

        if (uploadForm) {
            // Remove old listener by replacing node
            const newForm = uploadForm.cloneNode(true);
            uploadForm.parentNode.replaceChild(newForm, uploadForm);
            
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const file = newForm.querySelector('#clientFile').files[0];
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                    alert("File is too large. Maximum size is 10MB.");
                    return;
                }

                const newBtn = newForm.querySelector('#uploadBtn');
                newBtn.disabled = true;
                progressDiv.style.display = 'block';
                progressBar.style.width = '10%';
                uploadStatus.textContent = 'Preparing upload...';

                try {
                    if (typeof firebase.storage !== 'function') {
                        throw new Error("Storage SDK not loaded");
                    }
                    
                    const storageRef = firebase.storage().ref();
                    const fileRef = storageRef.child(`client_uploads/${code}/${Date.now()}_${file.name}`);
                    const uploadTask = fileRef.put(file);
                    
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            progressBar.style.width = progress + '%';
                            uploadStatus.textContent = `Uploading: ${Math.round(progress)}%`;
                        }, 
                        (error) => {
                            console.error("Upload error:", error);
                            uploadStatus.textContent = "Upload failed. Please try again.";
                            uploadStatus.style.color = "red";
                            newBtn.disabled = false;
                        }, 
                        async () => {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            await db.collection("client_uploads").add({
                                caseCode: code,
                                fileName: file.name,
                                fileSize: file.size,
                                url: downloadURL,
                                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            uploadStatus.textContent = "Upload complete!";
                            uploadStatus.style.color = "green";
                            newBtn.innerHTML = '<i class="fa-solid fa-check"></i> Uploaded';
                            newForm.reset();
                            setTimeout(() => {
                                progressDiv.style.display = 'none';
                                uploadStatus.style.color = "";
                                newBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload';
                                newBtn.disabled = false;
                            }, 3000);
                        }
                    );
                } catch (err) {
                    console.error("Setup error:", err);
                    uploadStatus.textContent = "System error. Try again later.";
                    uploadStatus.style.color = "red";
                    newBtn.disabled = false;
                }
            });
        }
    }

    // ── Load and render linked invoices ──────────────────────────────────────
    async function loadCaseInvoices(code) {
        // Remove any previous billing section
        const existingBilling = document.getElementById('billingSection');
        if (existingBilling) existingBilling.remove();

        try {
            const snap = await db.collection('invoices')
                .where('caseCode', '==', code)
                .get();

            if (snap.empty) return; // No invoices linked — section stays hidden

            const billingSection = document.createElement('div');
            billingSection.id = 'billingSection';
            billingSection.style.cssText = 'margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--color-border);';

            let invoiceRows = '';
            snap.forEach(doc => {
                const inv = doc.data();
                const isPaid = inv.status === 'paid';
                const payLink = `https://kalto-law.web.app/pay.html?invoice=${inv.invoiceId}`;
                const statusColor = isPaid ? '#12b76a' : '#f59e0b';
                const statusBg   = isPaid ? 'rgba(18,183,106,0.08)' : 'rgba(245,158,11,0.08)';
                const statusText = isPaid ? '&#10003; Paid' : '&#9203; Unpaid';
                const payBtn = isPaid
                    ? `<span style="color:#12b76a;font-weight:600;font-size:0.85rem;"><i class="fa-solid fa-circle-check"></i> Payment received</span>`
                    : `<a href="${payLink}" target="_blank" style="background:#0d1b35;color:white;text-decoration:none;padding:9px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;"><i class="fa-solid fa-credit-card"></i> Pay Now</a>`;

                invoiceRows += `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;background:white;border:1px solid var(--color-border);border-radius:12px;margin-bottom:12px;flex-wrap:wrap;gap:12px;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:44px;height:44px;border-radius:10px;background:rgba(197,160,89,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <i class="fa-solid fa-file-invoice-dollar" style="color:var(--color-accent);font-size:1.1rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight:700;color:#0d1b35;font-size:0.95rem;">${inv.invoiceId}</div>
                                <div style="font-size:0.8rem;color:#667085;">${inv.description || 'Legal Services'}</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
                            <div style="text-align:center;">
                                <div style="font-size:1.1rem;font-weight:800;color:#0d1b35;">${(inv.amount || 0).toLocaleString()} RWF</div>
                                <div style="font-size:0.72rem;color:#98a2b3;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount</div>
                            </div>
                            <span style="background:${statusBg};color:${statusColor};font-size:0.8rem;font-weight:700;padding:5px 14px;border-radius:50px;">${statusText}</span>
                            ${payBtn}
                        </div>
                    </div>`;
            });

            billingSection.innerHTML = `
                <h4 style="font-family:'Playfair Display',serif;margin-bottom:10px;color:#0d1b35;">
                    <i class="fa-solid fa-file-invoice-dollar" style="color:var(--color-accent);margin-right:8px;"></i>
                    Billing &amp; Payments
                </h4>
                <p style="color:#667085;font-size:0.9rem;margin-bottom:18px;">Invoices issued by KALTO LAW for this legal matter.</p>
                ${invoiceRows}
            `;

            // Insert before the upload section
            const uploadSection = document.querySelector('.client-upload-section');
            if (uploadSection) {
                uploadSection.parentNode.insertBefore(billingSection, uploadSection);
            } else {
                statusView.appendChild(billingSection);
            }
        } catch (e) {
            console.warn('Could not load invoices:', e);
        }
    }
});
