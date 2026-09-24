// portal-dashboard.js — All data logic for portal.html

window.addEventListener('portalUserReady', async () => {
    const user = window.currentUser;
    const db = window.fbDb;
    const storage = firebase.storage();

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function toast(msg, type = 'success') {
        const el = document.getElementById('toast');
        el.innerHTML = (type === 'error' ? '<i class="fa-solid fa-circle-exclamation" style="color:#ff6b7a"></i> ' : '<i class="fa-solid fa-circle-check" style="color:#c5a059"></i> ') + msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 4000);
    }

    function fmt(ts) { return ts ? ts.toDate().toLocaleDateString('en-RW', {year:'numeric',month:'short',day:'numeric'}) : 'N/A'; }

    function badge(status) {
        const cls = (status || '').toLowerCase().replace(/\s+/g, '-');
        return `<span class="badge badge-${cls}">${status}</span>`;
    }

    function empty(msg) {
        return `<div class="card-empty"><i class="fa-solid fa-inbox"></i><p>${msg}</p></div>`;
    }

    // ─── Populate sidebar user info ───────────────────────────────────────────
    const snap = await db.collection('users').doc(user.uid).get();
    const profile = snap.exists ? snap.data() : {};
    const name = profile.name || user.displayName || 'Client';

    document.getElementById('welcomeTitle').textContent = `Welcome back, ${name.split(' ')[0]}!`;
    document.getElementById('sidebarName').textContent = name;
    document.getElementById('sidebarEmail').textContent = user.email;
    const avatarEl = document.getElementById('sidebarAvatar');
    if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="">`;
    } else {
        avatarEl.textContent = name[0].toUpperCase();
    }

    // Prefill profile tab
    if (document.getElementById('profileName')) document.getElementById('profileName').value = name;
    if (document.getElementById('profileEmail')) document.getElementById('profileEmail').value = user.email;
    if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = profile.phone || '';

    // ─── Load Overview (stats + recent cases) ────────────────────────────────
    async function loadOverview() {
        try {
            const [casesSnap, invoicesSnap, bookingsSnap, msgsSnap] = await Promise.all([
                db.collection('cases').where('uid','==',user.uid).get(),
                db.collection('invoices').where('uid','==',user.uid).where('status','==','unpaid').get(),
                db.collection('appointments').where('uid','==',user.uid).where('status','==','Confirmed').get(),
                db.collection('messages').where('uid','==',user.uid).get()
            ]);
            document.getElementById('statCases').textContent = casesSnap.size;
            document.getElementById('statUnpaid').textContent = invoicesSnap.size;
            document.getElementById('statBookings').textContent = bookingsSnap.size;
            document.getElementById('statMessages').textContent = msgsSnap.size;

            const tbody = document.getElementById('overviewCasesBody');
            if (casesSnap.empty) {
                tbody.innerHTML = `<tr><td colspan="4">${empty('No cases linked yet. Go to "My Cases" to link an existing case.')}</td></tr>`;
                return;
            }
            tbody.innerHTML = '';
            casesSnap.docs.slice(0,5).forEach(doc => {
                const d = doc.data();
                tbody.innerHTML += `<tr>
                    <td><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-weight:700">${d.trackingCode}</code></td>
                    <td>${d.description || 'Legal Matter'}</td>
                    <td>${badge(d.status)}</td>
                    <td style="color:#667085">${fmt(d.lastUpdated)}</td>
                </tr>`;
            });
        } catch(e) { console.error(e); }
    }
    loadOverview();

    // ─── Cases Tab (with Timeline) ────────────────────────────────────────────
    function buildTimeline(status) {
        const steps=[{k:'Initiated',l:'Case Opened',i:'fa-folder-plus'},{k:'Under Review',l:'Under Review',i:'fa-magnifying-glass'},{k:'Active',l:'Active Proceedings',i:'fa-gavel'},{k:'Final Stage',l:'Final Stage',i:'fa-hourglass-end'},{k:'Completed',l:'Resolved',i:'fa-circle-check'}];
        const idx={Initiated:0,'Under Review':1,Active:2,'Final Stage':3,Completed:4,Closed:4,closed:4,completed:4,active:2,initiated:0};
        const cur=idx[status]??0;
        return `<div style="padding:12px 0"><p style="font-size:0.75rem;color:#667085;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px"><i class="fa-solid fa-timeline" style="color:#c5a059;margin-right:6px"></i>Case Progress</p><div style="display:flex;align-items:flex-start">`+steps.map((s,i)=>{
            const done=i<cur,curr=i===cur,c=done||curr?'#c5a059':'#d1d5db',tc=done||curr?'#0d1b35':'#9ca3af';
            const connector=i<steps.length-1?`<div style="flex:1;height:2px;background:${done?'#c5a059':'#e4e7ec'};margin-top:19px"></div>`:'';            return `<div style="display:flex;flex-direction:column;align-items:center;flex:1"><div style="width:36px;height:36px;border-radius:50%;background:${done||curr?'rgba(197,160,89,0.12)':'#f9fafb'};border:2px solid ${c};display:flex;align-items:center;justify-content:center;margin-bottom:6px"><i class="fa-solid ${s.i}" style="color:${c};font-size:0.8rem"></i></div><div style="font-size:0.68rem;font-weight:${curr?700:500};color:${tc};text-align:center;max-width:60px;line-height:1.3">${s.l}</div>${curr?'<div style="font-size:0.62rem;color:#c5a059;font-weight:700">●NOW</div>':''}</div>${connector}`;
        }).join('')+`</div></div>`;
    }
    window.loadCases = async function() {
        const tbody = document.getElementById('casesBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
        try {
            const snap = await db.collection('cases').where('uid','==',user.uid).orderBy('lastUpdated','desc').get();
            if (snap.empty) { tbody.innerHTML = `<tr><td colspan="5">${empty('No cases found. Link a case above.')}</td></tr>`; return; }
            tbody.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const docs=(d.documents||[]).map(dc=>`<a href="${dc.url}" target="_blank" style="color:#c5a059;margin-right:6px;font-size:0.8rem"><i class="fa-solid fa-file-pdf"></i> ${dc.name}</a>`).join('')||'<span style="color:#98a2b3;font-size:0.8rem">None yet</span>';
                const rowId='case-'+doc.id;
                tbody.innerHTML+=`<tr style="cursor:pointer" onclick="const r=document.getElementById('${rowId}');r.style.display=r.style.display==='none'?'table-row':'none'">
                    <td><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-weight:700">${d.trackingCode}</code> <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;color:#c5a059;margin-left:4px"></i></td>
                    <td>${d.description||'—'}</td><td>${badge(d.status)}</td>
                    <td style="color:#667085">${fmt(d.lastUpdated)}</td><td>${docs}</td>
                </tr><tr id="${rowId}" style="display:none;background:#fafbfc"><td colspan="5" style="padding:0 24px 16px">${buildTimeline(d.status)}</td></tr>`;
            });
        } catch(e) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:#d92d20;padding:20px">Error loading cases.</td></tr>'; }
    };

    window.claimCaseFromPortal = async function() {
        const code = document.getElementById('claimCodeInput')?.value?.trim().toUpperCase();
        if (!code) return toast('Please enter a tracking code.', 'error');
        try {
            const q = await db.collection('cases').where('trackingCode','==',code).limit(1).get();
            if (q.empty) return toast('Tracking code not found. Please check with our office.', 'error');
            const docRef = q.docs[0].ref;
            const existing = q.docs[0].data();
            if (existing.uid && existing.uid !== user.uid) return toast('This case is already linked to another account.', 'error');
            await docRef.update({ uid: user.uid });
            toast('Case linked successfully!');
            document.getElementById('claimCodeInput').value = '';
            loadCases();
            loadOverview();
        } catch(e) { toast('Error linking case. Please try again.', 'error'); }
    };

    // ─── Invoices Tab ─────────────────────────────────────────────────────────
    window.loadInvoices = async function() {
        const tbody = document.getElementById('invoicesBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
        try {
            const snap = await db.collection('invoices').where('uid','==',user.uid).orderBy('createdAt','desc').get();
            if (snap.empty) { tbody.innerHTML = `<tr><td colspan="5">${empty('No invoices found. Our team will notify you when an invoice is issued.')}</td></tr>`; return; }
            tbody.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const payBtn = d.status === 'unpaid' ? `<a href="pay.html?invoice=${d.invoiceId}" class="btn-outline" style="font-size:0.8rem;padding:6px 12px;text-decoration:none;display:inline-block"><i class="fa-solid fa-credit-card"></i> Pay Now</a>` : `<span style="color:#12b76a;font-size:0.85rem;font-weight:600"><i class="fa-solid fa-check-circle"></i> Paid</span>`;
                const inv = {invoiceId:d.invoiceId,clientName:d.clientName||name,description:d.description,amount:d.amount,status:d.status};
                tbody.innerHTML += `<tr>
                    <td style="font-weight:700;color:#0d1b35">${d.invoiceId}</td>
                    <td>${d.description || 'Legal Services'}</td>
                    <td style="font-weight:700">${(d.amount||0).toLocaleString()} RWF</td>
                    <td>${badge(d.status)}</td>
                    <td style="display:flex;gap:6px;align-items:center">
                        ${payBtn}
                        <button onclick='window.downloadInvoicePDF(${JSON.stringify(inv)})' style="background:none;border:1px solid #e4e7ec;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:0.78rem;color:#667085;font-family:Inter,sans-serif;display:inline-flex;align-items:center;gap:4px"><i class="fa-solid fa-file-pdf" style="color:#d92d20"></i> PDF</button>
                    </td>
                </tr>`;
            });
        } catch(e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#d92d20;padding:20px">Error loading invoices.</td></tr>'; }
    };

    // ─── PDF Invoice Download (jsPDF CDN) ─────────────────────────────────────
    window.downloadInvoicePDF = function(inv) {
        if (!window.jspdf) { alert('PDF library loading, please try again in a moment.'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit:'mm', format:'a4' });
        const navy=[13,27,53], gold=[197,160,89], w=210;
        doc.setFillColor(...navy); doc.rect(0,0,w,38,'F');
        doc.setTextColor(197,160,89); doc.setFontSize(22); doc.setFont('helvetica','bold');
        doc.text('KALTO LAW AND SERVICES LTD',14,18);
        doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(180,200,230);
        doc.text('Kigali, Rwanda  |  kalto-law.web.app  |  info@kaltolawfirm.com',14,27);
        doc.setFillColor(...gold); doc.rect(0,38,w,8,'F');
        doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
        doc.text('OFFICIAL INVOICE',14,44);
        doc.setFillColor(248,250,252); doc.roundedRect(12,52,w-24,50,3,3,'F');
        doc.setTextColor(...navy); doc.setFontSize(12); doc.setFont('helvetica','bold');
        doc.text('Invoice No: '+inv.invoiceId,18,64);
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text('Client: '+(inv.clientName||'Client'),18,74);
        doc.text('Service: '+(inv.description||'Legal Services'),18,83);
        doc.text('Date: '+new Date().toLocaleDateString('en-RW',{year:'numeric',month:'long',day:'numeric'}),18,92);
        const isPaid=(inv.status||'').toLowerCase()==='paid';
        doc.setFillColor(isPaid?220:254,isPaid?252:242,isPaid?231:242);
        doc.roundedRect(w-60,58,46,14,3,3,'F');
        doc.setTextColor(isPaid?22:153,isPaid?101:27,isPaid?52:27);
        doc.setFont('helvetica','bold'); doc.setFontSize(10);
        doc.text(isPaid?'PAID':'UNPAID',w-37,67,{align:'center'});
        doc.setFillColor(...navy); doc.roundedRect(12,110,w-24,24,3,3,'F');
        doc.setTextColor(...gold); doc.setFontSize(11); doc.setFont('helvetica','bold');
        doc.text('TOTAL AMOUNT DUE',18,122);
        doc.setFontSize(14);
        doc.text('RWF '+Number(inv.amount||0).toLocaleString(),w-18,122,{align:'right'});
        doc.setFillColor(...gold); doc.rect(0,272,w,25,'F');
        doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','normal');
        doc.text('KALTO LAW AND SERVICES LTD  |  This is a computer-generated document',w/2,283,{align:'center'});
        doc.save('KALTO-'+inv.invoiceId+'.pdf');
    };

    // ─── Bookings Tab ─────────────────────────────────────────────────────────
    window.loadBookings = async function() {
        const tbody = document.getElementById('bookingsBody');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
        try {
            const snap = await db.collection('appointments').where('uid','==',user.uid).orderBy('createdAt','desc').get();
            if (snap.empty) { tbody.innerHTML = `<tr><td colspan="3">${empty('No consultations scheduled yet. Book one above!')}</td></tr>`; return; }
            tbody.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                tbody.innerHTML += `<tr>
                    <td style="font-weight:600">${d.service}</td>
                    <td>${d.date} at ${d.time}</td>
                    <td>${badge(d.status || 'Pending')}</td>
                </tr>`;
            });
        } catch(e) { console.error(e); }
    };

    window.submitBooking = async function() {
        const service  = document.getElementById('bookService').value;
        // Support both old date input (fallback) and new interactive calendar
        const date  = (window._calBookingDate && window._calBookingDate()) || document.getElementById('bookDate')?.value || '';
        const time  = (window._calBookingTime && window._calBookingTime()) || document.getElementById('bookTime')?.value || '';
        const notes = document.getElementById('bookNotes').value;

        if (!date) return toast('Please select a date on the calendar.', 'error');
        if (!time) return toast('Please select a time slot.', 'error');

        const btn = document.getElementById('submitBookingBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Booking...'; }

        try {
            const docNumber = 'KALTO-' + Math.floor(100000 + Math.random() * 900000);

            await db.collection('appointments').doc(docNumber).set({
                uid: user.uid,
                name: name,
                email: user.email,
                phone: profile.phone || '',
                service, date, time, notes,
                docNumber,
                status: 'Pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            const successMsg = `✅ Consultation booked! Your tracking number is: ${docNumber}.`;
            toast(successMsg);
            setTimeout(() => alert(`Consultation requested successfully! Your tracking number is: ${docNumber}. Please save it for your records.`), 500);

            // Reset calendar state
            if (window._calBookingDate) {
                window.calSelectedDate = null;
                window.calSelectedTime = null;
                if (typeof renderCalendar === 'function') renderCalendar();
                const timeSection = document.getElementById('timeSlotSection');
                if (timeSection) timeSection.style.display = 'none';
                const calLabel = document.getElementById('calSelectedLabel');
                if (calLabel) calLabel.textContent = '';
            }
            if (document.getElementById('bookNotes')) document.getElementById('bookNotes').value = '';
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Confirm Appointment'; }
            loadBookings();
            loadOverview();
        } catch(e) {
            toast('Error submitting. Please try again.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Confirm Appointment'; }
        }
    };

    // ─── Messages / Ask a Lawyer Tab (Real-Time) ──────────────────────────────
    let _msgUnsub = null;
    window.loadMessages = function() {
        const container = document.getElementById('messagesBody');
        container.innerHTML = '<div style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i></div>';
        if (_msgUnsub) { _msgUnsub(); _msgUnsub = null; }
        _msgUnsub = db.collection('messages').where('uid','==',user.uid).orderBy('createdAt','asc')
            .onSnapshot(snap => {
                if (snap.empty) { container.innerHTML = empty('No messages yet. Send your first question above.'); return; }
                container.innerHTML = '';
                snap.forEach(doc => {
                    const d = doc.data();
                    container.innerHTML += `<div style="margin-bottom:20px;padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e4e7ec">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                            <span style="font-size:0.75rem;color:#98a2b3">${fmt(d.createdAt)}</span>
                            ${d.adminReply?'<span class="badge-answered">Answered</span>':'<span class="badge-open">Awaiting Reply</span>'}
                        </div>
                        <div class="bubble client"><strong>You:</strong> ${d.question}</div>
                        ${d.adminReply
                            ?`<div class="bubble admin" style="margin-top:10px;animation:fadeUp 0.3s ease"><strong style="color:#0d1b35"><i class="fa-solid fa-scale-balanced" style="color:#c5a059;margin-right:4px"></i>KALTO LAW:</strong> ${d.adminReply}</div>`
                            :`<div style="margin-top:10px;padding:10px 14px;background:#fffbf4;border-radius:8px;font-size:0.8rem;color:#b76e00;border:1px dashed rgba(197,160,89,0.35)"><i class="fa-solid fa-clock" style="margin-right:6px"></i>Our team is reviewing your question — reply within 24 hours.</div>`
                        }
                    </div>`;
                });
                container.scrollTop = container.scrollHeight;
            }, () => { container.innerHTML = '<p style="color:#d92d20;text-align:center">Error loading messages.</p>'; });
    };

    window.submitMessage = async function() {
        const question = document.getElementById('msgQuestion')?.value?.trim();
        if (!question) return toast('Please type your question first.', 'error');
        try {
            await db.collection('messages').add({
                uid: user.uid,
                clientName: name,
                email: user.email,
                question,
                adminReply: null,
                status: 'open',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast('Question sent! Our legal team will reply within 24 hours.');
            document.getElementById('msgQuestion').value = '';
            loadMessages();
        } catch(e) { toast('Error sending message.', 'error'); }
    };

    // ─── Uploads Tab ─────────────────────────────────────────────────────────
    window.prefillUploadCase = async function() {
        const snap = await db.collection('cases').where('uid','==',user.uid).limit(1).get();
        if (!snap.empty) {
            document.getElementById('uploadCase').value = snap.docs[0].data().trackingCode || '';
        }
    };

    window.submitUpload = async function() {
        const caseCode = document.getElementById('uploadCase').value.trim().toUpperCase();
        const fileInput = document.getElementById('uploadFile');
        const file = fileInput.files[0];
        if (!caseCode) return toast('Please enter your case tracking code.', 'error');
        if (!file) return toast('Please select a file to upload.', 'error');
        if (file.size > 10 * 1024 * 1024) return toast('File must be under 10MB.', 'error');

        const progressBar = document.getElementById('uploadProgress');
        const bar = document.getElementById('uploadBar');
        progressBar.style.display = 'block';

        const storageRef = storage.ref(`client_uploads/${caseCode}/${Date.now()}_${file.name}`);
        const uploadTask = storageRef.put(file);

        uploadTask.on('state_changed',
            snap => { bar.style.width = Math.round((snap.bytesTransferred / snap.totalBytes) * 100) + '%'; },
            err => { toast('Upload failed: ' + err.message, 'error'); progressBar.style.display = 'none'; },
            async () => {
                const url = await uploadTask.snapshot.ref.getDownloadURL();
                await db.collection('client_uploads').add({
                    uid: user.uid,
                    caseCode,
                    fileName: file.name,
                    url,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                toast('Document uploaded successfully!');
                progressBar.style.display = 'none';
                bar.style.width = '0';
                fileInput.value = '';
            }
        );
    };

    // ─── Profile Tab ─────────────────────────────────────────────────────────
    window.saveProfile = async function() {
        const newName = document.getElementById('profileName').value.trim();
        const newPhone = document.getElementById('profilePhone').value.trim();
        if (!newName) return toast('Name cannot be empty.', 'error');
        try {
            await db.collection('users').doc(user.uid).update({ name: newName, phone: newPhone });
            await user.updateProfile({ displayName: newName });
            document.getElementById('sidebarName').textContent = newName;
            document.getElementById('welcomeTitle').textContent = `Welcome back, ${newName.split(' ')[0]}!`;
            toast('Profile updated successfully!');
        } catch(e) { toast('Error saving profile.', 'error'); }
    };

    // ── GA4 Custom Event Tracking ─────────────────────────────────────────────
    // Wrap submitBooking to track
    const _origSubmitBooking = window.submitBooking;
    window.submitBooking = async function() {
        if (window.gaEvent) gaEvent('booking_submitted', 'Portal', 'Consultation Booking');
        return _origSubmitBooking ? _origSubmitBooking.apply(this, arguments) : undefined;
    };
    // Wrap submitMessage to track
    const _origSubmitMessage = window.submitMessage;
    window.submitMessage = async function() {
        if (window.gaEvent) gaEvent('message_sent', 'Portal', 'Ask a Lawyer');
        return _origSubmitMessage ? _origSubmitMessage.apply(this, arguments) : undefined;
    };
    // Track invoice PDF download
    const _origDownloadPDF = window.downloadInvoicePDF;
    window.downloadInvoicePDF = function(inv) {
        if (window.gaEvent) gaEvent('invoice_pdf_downloaded', 'Portal', inv.invoiceId);
        return _origDownloadPDF ? _origDownloadPDF(inv) : undefined;
    };

    // ── #16 Client Satisfaction Ratings ──────────────────────────────────────
    window.loadRatings = async function() {
        const container = document.getElementById('ratingsBody');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i></div>';
        try {
            // Load completed/closed cases
            const casesSnap = await db.collection('cases')
                .where('uid', '==', user.uid)
                .get();
            const closedCases = casesSnap.docs.filter(d => {
                const s = (d.data().status || '').toLowerCase();
                return s === 'completed' || s === 'closed';
            });

            if (closedCases.length === 0) {
                container.innerHTML = `<div style="text-align:center;padding:40px;color:#667085">
                    <i class="fa-solid fa-star" style="font-size:2rem;color:#e4e7ec;display:block;margin-bottom:12px"></i>
                    <p>No completed cases to rate yet. Ratings appear once a case is resolved.</p>
                </div>`;
                return;
            }

            // Check existing ratings
            const ratingsSnap = await db.collection('ratings').where('uid', '==', user.uid).get();
            const ratedCaseIds = new Set(ratingsSnap.docs.map(d => d.data().caseId));

            container.innerHTML = '';
            closedCases.forEach(doc => {
                const d = doc.data();
                const alreadyRated = ratedCaseIds.has(doc.id);
                const existingRating = alreadyRated ? ratingsSnap.docs.find(r => r.data().caseId === doc.id)?.data() : null;

                container.innerHTML += `
                <div style="background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:24px;margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                        <div>
                            <code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-weight:700;font-size:0.85rem">${d.trackingCode}</code>
                            <div style="margin-top:6px;font-weight:600;color:#0d1b35">${d.description || 'Legal Matter'}</div>
                            <div style="font-size:0.8rem;color:#667085;margin-top:3px">Status: Resolved</div>
                        </div>
                        ${alreadyRated ? `<div style="display:flex;align-items:center;gap:6px">
                            ${'★'.repeat(existingRating.stars)}${'☆'.repeat(5-existingRating.stars)}
                            <span style="font-size:0.8rem;color:#667085">Your rating</span>
                        </div>` : ''}
                    </div>
                    ${alreadyRated
                        ? `<div style="margin-top:14px;padding:12px;background:#f0fdf4;border-radius:8px;font-size:0.88rem;color:#027a48">
                            <i class="fa-solid fa-circle-check"></i> Thank you for your feedback!
                            ${existingRating.comment ? `<div style="margin-top:6px;color:#344054;font-style:italic">"${existingRating.comment}"</div>` : ''}
                          </div>`
                        : `<div style="margin-top:16px">
                            <p style="font-size:0.85rem;font-weight:600;color:#344054;margin-bottom:8px">How would you rate your experience with this case?</p>
                            <div class="star-rating" id="stars-${doc.id}" style="display:flex;gap:8px;margin-bottom:12px">
                                ${[1,2,3,4,5].map(i => `<span data-val="${i}" onclick="selectStar('${doc.id}',${i})" style="font-size:1.8rem;cursor:pointer;color:#e4e7ec;transition:color 0.15s">★</span>`).join('')}
                            </div>
                            <textarea id="comment-${doc.id}" placeholder="Share your experience (optional)..." style="width:100%;padding:10px 14px;border:1px solid #e4e7ec;border-radius:8px;font-family:'Inter',sans-serif;font-size:0.88rem;resize:vertical;min-height:70px;box-sizing:border-box;outline:none;" rows="2"></textarea>
                            <button class="btn-primary" style="margin-top:10px;font-size:0.88rem;padding:9px 18px" onclick="submitRating('${doc.id}','${d.trackingCode}')">
                                <i class="fa-solid fa-paper-plane"></i> Submit Rating
                            </button>
                           </div>`
                    }
                </div>`;
            });
        } catch(e) { container.innerHTML = '<p style="color:#d92d20;text-align:center">Error loading ratings.</p>'; }
    };

    window.selectStar = function(caseId, val) {
        const stars = document.querySelectorAll(`#stars-${caseId} span`);
        stars.forEach((s, i) => {
            s.style.color = i < val ? '#c5a059' : '#e4e7ec';
            s.dataset.selected = i < val ? 'true' : 'false';
        });
        document.querySelector(`#stars-${caseId}`).dataset.rating = val;
    };

    window.submitRating = async function(caseId, caseCode) {
        const starsEl = document.getElementById(`stars-${caseId}`);
        const stars = Number(starsEl?.dataset?.rating || 0);
        if (!stars) return toast('Please select a star rating.', 'error');
        const comment = document.getElementById(`comment-${caseId}`)?.value?.trim() || '';
        try {
            await db.collection('ratings').add({
                uid: user.uid, clientName: name, caseId, caseCode,
                stars, comment,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (window.gaEvent) gaEvent('case_rated', 'Portal', caseCode, stars);
            toast('Thank you for your feedback! ⭐');
            loadRatings();
        } catch(e) { toast('Error submitting rating.', 'error'); }
    };

    // ── #19 e-Signature ───────────────────────────────────────────────────────
    let _sigCanvas = null, _sigCtx = null, _sigDrawing = false;
    let _currentSigReqId = null;

    window.loadSignatureRequests = async function() {
        const container = document.getElementById('signatureRequestsBody');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i></div>';
        try {
            const snap = await db.collection('signature_requests')
                .where('clientUid', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .get();
            if (snap.empty) {
                container.innerHTML = `<div style="text-align:center;padding:40px;color:#667085">
                    <i class="fa-solid fa-signature" style="font-size:2rem;color:#e4e7ec;display:block;margin-bottom:12px"></i>
                    <p>No documents pending your signature. Our team will notify you when one is ready.</p>
                </div>`;
                return;
            }
            container.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const isSigned = d.status === 'signed';
                container.innerHTML += `
                <div style="background:#fff;border:1px solid ${isSigned?'#d1fae5':'#fef3c7'};border-radius:14px;padding:22px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
                    <div>
                        <div style="font-weight:700;color:#0d1b35;margin-bottom:4px"><i class="fa-solid fa-file-contract" style="color:#c5a059;margin-right:8px"></i>${d.documentName || 'Legal Document'}</div>
                        <div style="font-size:0.8rem;color:#667085">Requested by Kalto Law · ${d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString('en-RW') : ''}</div>
                        ${d.documentUrl ? `<a href="${d.documentUrl}" target="_blank" style="font-size:0.8rem;color:#4361ee;margin-top:4px;display:inline-block"><i class="fa-solid fa-eye"></i> View Document</a>` : ''}
                    </div>
                    <div>
                        ${isSigned
                            ? `<span style="background:#d1fae5;color:#027a48;padding:6px 14px;border-radius:50px;font-size:0.8rem;font-weight:700"><i class="fa-solid fa-circle-check"></i> Signed</span>`
                            : `<button class="btn-primary" style="font-size:0.88rem;padding:9px 18px" onclick="openSigPad('${doc.id}','${(d.documentName||'').replace(/'/g,'')}')">
                                <i class="fa-solid fa-pen-nib"></i> Sign Now
                              </button>`
                        }
                    </div>
                </div>`;
            });
        } catch(e) { container.innerHTML = '<p style="color:#d92d20;text-align:center">Error loading signature requests.</p>'; }
    };

    window.openSigPad = function(reqId, docName) {
        _currentSigReqId = reqId;
        document.getElementById('sigDocName').textContent = docName;
        document.getElementById('sigPadOverlay').style.display = 'flex';
        // Init canvas
        _sigCanvas = document.getElementById('sigCanvas');
        _sigCtx = _sigCanvas.getContext('2d');
        _sigCtx.clearRect(0, 0, _sigCanvas.width, _sigCanvas.height);
        _sigCtx.strokeStyle = '#0d1b35';
        _sigCtx.lineWidth = 2.5;
        _sigCtx.lineCap = 'round';
        _sigCtx.lineJoin = 'round';

        // Mouse events
        _sigCanvas.onmousedown = e => { _sigDrawing = true; _sigCtx.beginPath(); const r = _sigCanvas.getBoundingClientRect(); _sigCtx.moveTo((e.clientX-r.left)*(_sigCanvas.width/r.width), (e.clientY-r.top)*(_sigCanvas.height/r.height)); };
        _sigCanvas.onmousemove = e => { if (!_sigDrawing) return; const r = _sigCanvas.getBoundingClientRect(); _sigCtx.lineTo((e.clientX-r.left)*(_sigCanvas.width/r.width),(e.clientY-r.top)*(_sigCanvas.height/r.height)); _sigCtx.stroke(); };
        _sigCanvas.onmouseup = () => _sigDrawing = false;
        _sigCanvas.onmouseleave = () => _sigDrawing = false;

        // Touch events
        _sigCanvas.ontouchstart = e => { e.preventDefault(); _sigDrawing = true; _sigCtx.beginPath(); const r = _sigCanvas.getBoundingClientRect(), t = e.touches[0]; _sigCtx.moveTo((t.clientX-r.left)*(_sigCanvas.width/r.width),(t.clientY-r.top)*(_sigCanvas.height/r.height)); };
        _sigCanvas.ontouchmove = e => { e.preventDefault(); if (!_sigDrawing) return; const r = _sigCanvas.getBoundingClientRect(), t = e.touches[0]; _sigCtx.lineTo((t.clientX-r.left)*(_sigCanvas.width/r.width),(t.clientY-r.top)*(_sigCanvas.height/r.height)); _sigCtx.stroke(); };
        _sigCanvas.ontouchend = () => _sigDrawing = false;
    };

    window.clearSigPad = function() {
        if (_sigCtx && _sigCanvas) _sigCtx.clearRect(0, 0, _sigCanvas.width, _sigCanvas.height);
    };

    window.submitSignature = async function() {
        if (!_currentSigReqId || !_sigCanvas) return;
        // Check if canvas has content
        const blank = document.createElement('canvas');
        blank.width = _sigCanvas.width; blank.height = _sigCanvas.height;
        if (_sigCanvas.toDataURL() === blank.toDataURL()) return toast('Please draw your signature first.', 'error');

        const btn = document.getElementById('sigSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        try {
            const signatureData = _sigCanvas.toDataURL('image/png');
            await db.collection('signature_requests').doc(_currentSigReqId).update({
                status: 'signed',
                signatureData,
                signedAt: firebase.firestore.FieldValue.serverTimestamp(),
                signedBy: user.email
            });
            if (window.gaEvent) gaEvent('document_signed', 'Portal', _currentSigReqId);
            document.getElementById('sigPadOverlay').style.display = 'none';
            toast('Document signed successfully! ✅');
            loadSignatureRequests();
        } catch(e) { toast('Error saving signature.', 'error'); }
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Confirm & Sign';
    };
});

