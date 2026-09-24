document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to initialize
    const checkFirebase = setInterval(() => {
        if (window.fbAuth) {
            clearInterval(checkFirebase);
            initAdmin();
        }
    }, 100);

    function initAdmin() {
        const auth = window.fbAuth;
        const db = window.fbDb;

        const loginView = document.getElementById('loginView');
        const dashboardView = document.getElementById('dashboardView');
        const loginForm = document.getElementById('loginForm');
        const loginError = document.getElementById('loginError');
        const logoutBtn = document.getElementById('logoutBtn');
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a[data-tab]');
        const tabPanes = document.querySelectorAll('.tab-pane');
        const pageTitle = document.getElementById('pageTitle');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const adminSidebar = document.querySelector('.admin-sidebar');
        const toast = document.getElementById('toast');

        // --- ADMIN UI POLISH ---
        const modalOverlay = document.getElementById('modalOverlay');
        const modalBody = document.getElementById('modalBody');
        const modalTitle = document.getElementById('modalTitle');
        const modalIcon = document.getElementById('modalIcon');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');

        function showCustomModal({ title, icon, contentHTML, confirmText = 'Confirm', cancelText = 'Cancel' }) {
            return new Promise((resolve, reject) => {
                modalTitle.textContent = title;
                modalIcon.className = `fa-solid ${icon}`;
                modalBody.innerHTML = contentHTML;
                modalConfirm.textContent = confirmText;
                modalCancel.textContent = cancelText;

                modalOverlay.classList.add('active');

                modalConfirm.onclick = () => {
                    const inputs = modalBody.querySelectorAll('input, select, textarea');
                    if (inputs.length > 0) {
                        const results = {};
                        inputs.forEach(i => results[i.id || i.name] = i.value);
                        resolve(results);
                    } else {
                        resolve(true);
                    }
                    modalOverlay.classList.remove('active');
                };

                modalCancel.onclick = () => {
                    modalOverlay.classList.remove('active');
                    reject();
                };
            });
        }

        function showConfirmModal(title, message) {
            return showCustomModal({
                title: title,
                icon: 'fa-circle-exclamation',
                contentHTML: `<p style="color: #475467; font-size: 1.1rem; line-height: 1.5;">${message}</p>`,
                confirmText: 'Delete Permanently',
                cancelText: 'Keep it'
            });
        }

        // --- UI HELPERS ---
        function showToast(message, type = 'success') {
            const icon = type === 'error' ? '<i class="fa-solid fa-circle-exclamation" style="color: #ff4444;"></i>' : '<i class="fa-solid fa-circle-check" style="color: var(--color-accent);"></i>';
            toast.innerHTML = `${icon} ${message}`;
            toast.className = type === 'error' ? 'show error' : 'show';
            setTimeout(() => toast.className = '', 4000);
        }

        // Mobile Menu Toggle
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                adminSidebar.classList.toggle('active');
            });
        }

        // --- AUTHENTICATION ---
        auth.onAuthStateChanged((user) => {
            if (user) {
                loginView.style.display = 'none';
                dashboardView.style.display = 'block';
                loadInitialData();
            } else {
                loginView.style.display = 'flex';
                dashboardView.style.display = 'none';
            }
        });

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('adminEmail').value;
                const pass = document.getElementById('adminPassword').value;

                try {
                    await auth.signInWithEmailAndPassword(email, pass);
                    loginError.style.display = 'none';
                } catch (error) {
                    console.error("Login Error:", error.code, error.message);
                    if (error.code === 'auth/operation-not-allowed') {
                        loginError.textContent = "Error: Email/Password login is not enabled in Firebase Console.";
                    } else {
                        loginError.textContent = "Invalid login credentials. Please check your email and password.";
                    }
                    loginError.style.display = 'block';
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await auth.signOut();
            });
        }

        // --- TAB NAVIGATION ---
        function switchTab(tabName) {
            const titleMap = {
                'overview': 'Dashboard Overview',
                'content': 'Website Content Editor',
                'blog': 'Legal Insights Manager',
                'documents': 'Case Documents',
                'messages': 'Client Messages',
                'appointments': 'Consultation Appointments',
                'cases': 'Legal Case Manager',
                'billing': 'Billing',
                'uploads': 'Client Uploads',
                'lawyerinbox': 'Ask a Lawyer — Inbox',
                'clientaccounts': 'Client Accounts'
            };
            pageTitle.textContent = titleMap[tabName] || 'Dashboard';

            sidebarLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('data-tab') === tabName);
            });

            tabPanes.forEach(pane => {
                pane.style.display = pane.id === `${tabName}Tab` ? 'block' : 'none';
            });

            // Close mobile sidebar if open
            if (adminSidebar.classList.contains('active')) {
                adminSidebar.classList.remove('active');
            }

            // Load specific tab data
            if (tabName === 'documents') renderDocumentsTab();
            if (tabName === 'blog') renderBlogList();
            if (tabName === 'content' && (!cmsTextarea.value || cmsTextarea.value === "Loading current content...")) {
                cmsSelector.dispatchEvent(new Event('change'));
            }
            if (tabName === 'messages') renderMessagesList();
            if (tabName === 'appointments') renderAppointmentsList();
            if (tabName === 'cases') renderCasesList();
        }

        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(link.getAttribute('data-tab'));
            });
        });

        window.switchTab = switchTab;
        window.showToast = showToast;
        window.showCustomModal = showCustomModal;
        window.showConfirmModal = showConfirmModal;
        
        window.switchDocSubtab = (sub) => { /* logic */ };
        window.switchBillingSubtab = (sub) => { /* logic */ };

        // --- CMS & BLOG MANAGEMENT ---
        const cmsSelector = document.getElementById('cmsSelectorEl') || document.querySelector('#contentTab select');
        const cmsTextarea = document.querySelector('#contentTab textarea');
        const cmsSaveBtn = document.getElementById('cmsSaveBtn');
        const blogTableBody = document.getElementById('blogTableBody');
        const newPostBtn = document.getElementById('newPostBtn');
        const vaultTableBody = document.getElementById('vaultTableBody');
        const addDocBtn = document.getElementById('addDocBtn');
        const appointmentsTableBody = document.getElementById('appointmentsTableBody');

        async function loadInitialData() {
            try {
                // ── Parallel-fetch all collections ──────────────────────────
                const [
                    insightsSnap, vaultSnap, casesSnap, messagesSnap,
                    appointmentsSnap, invoicesSnap, clientsSnap, uploadsSnap, ratingsSnap
                ] = await Promise.all([
                    db.collection('insights').get(),
                    db.collection('documents').get(),
                    db.collection('cases').get(),
                    db.collection('messages').orderBy('createdAt','desc').get(),
                    db.collection('appointments').get(),
                    db.collection('invoices').get(),
                    db.collection('users').get(),
                    db.collection('client_uploads').get(),
                    db.collection('ratings').get(),
                ]);

                // ── Compute KPIs ────────────────────────────────────────────
                const totalCases   = casesSnap.size;
                const openCases    = casesSnap.docs.filter(d => !['Closed','Completed','closed','completed'].includes(d.data().status)).length;
                const unreadMsgs   = messagesSnap.docs.filter(d => d.data().status !== 'answered').length;
                const pendingAppts = appointmentsSnap.docs.filter(d => ['Pending','pending'].includes(d.data().status)).length;
                const totalClients = clientsSnap.size;
                const totalUploads = uploadsSnap.size;

                // Revenue
                let totalRevenue = 0, pendingRevenue = 0;
                invoicesSnap.docs.forEach(d => {
                    const inv = d.data();
                    const amt = Number(inv.amount) || 0;
                    if (inv.status === 'paid') totalRevenue += amt;
                    else pendingRevenue += amt;
                });
                const pendingInvoices = invoicesSnap.docs.filter(d => d.data().status !== 'paid').length;

                // Ratings average
                let avgRating = 0;
                if (ratingsSnap.size > 0) {
                    const totalStars = ratingsSnap.docs.reduce((acc, d) => acc + (Number(d.data().stars) || 0), 0);
                    avgRating = (totalStars / ratingsSnap.size).toFixed(1);
                }
                const ratingDisplay = ratingsSnap.size > 0 ? `${avgRating} ★` : 'No ratings';

                // ── Render Analytics Overview HTML ──────────────────────────
                const overviewTab = document.getElementById('overviewTab');
                if (overviewTab) {
                    overviewTab.innerHTML = `
                    <div style="margin-bottom:32px;">
                        <h2 style="font-family:'Playfair Display',serif;font-size:1.6rem;color:var(--admin-sidebar-bg);margin-bottom:4px;">Analytics Overview</h2>
                        <p style="color:var(--admin-text-muted);font-size:0.9rem;">Live stats from all platform collections · Updated just now</p>
                    </div>

                    <!-- KPI Grid -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px;">
                        ${kpiCard('fa-users','Total Clients', totalClients, '#4361ee', 'Registered portal accounts', '')}
                        ${kpiCard('fa-folder-open','Open Cases', openCases, '#c5a059', `${totalCases} total cases`, openCases > 0 ? `${Math.round(openCases/Math.max(totalCases,1)*100)}% active` : 'All resolved')}
                        ${kpiCard('fa-comment-dots','Unanswered Messages', unreadMsgs, unreadMsgs > 0 ? '#d92d20' : '#12b76a', 'Via Ask a Lawyer', unreadMsgs > 0 ? 'Needs attention' : 'All clear')}
                        ${kpiCard('fa-calendar-clock','Pending Appointments', pendingAppts, '#f59e0b', `${appointmentsSnap.size} total bookings`, 'Awaiting confirmation')}
                        ${kpiCard('fa-file-invoice-dollar','Unpaid Invoices', pendingInvoices, pendingInvoices > 0 ? '#d92d20' : '#12b76a', `RWF ${pendingRevenue.toLocaleString()} outstanding`, pendingInvoices > 0 ? 'Follow up required' : 'All settled')}
                        ${kpiCard('fa-circle-dollar-to-slot','Revenue Collected', `RWF ${(totalRevenue/1000).toFixed(0)}K`, '#12b76a', 'From paid invoices', `${invoicesSnap.size} total invoices`)}
                        ${kpiCard('fa-cloud-arrow-up','Client Uploads', totalUploads, '#8b5cf6', 'Documents received', 'In secure storage')}
                        ${kpiCard('fa-scroll','Published Insights', insightsSnap.size, '#0d1b35', 'Legal articles live', `${vaultSnap.size} vault docs`)}
                        ${kpiCard('fa-star','Client Satisfaction', ratingDisplay, '#f59e0b', `${ratingsSnap.size} ratings received`, avgRating >= 4 ? '🏆 Excellent' : avgRating >= 3 ? '👍 Good' : ratingsSnap.size > 0 ? '⚠ Needs attention' : 'No data yet')}
                    </div>

                    <!-- Revenue + Activity Row -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">

                        <!-- Revenue Breakdown -->
                        <div class="dashboard-card">
                            <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--admin-sidebar-bg);margin-bottom:20px;"><i class="fa-solid fa-chart-pie" style="color:#c5a059;margin-right:8px;"></i>Revenue Breakdown</h3>
                            <div style="display:flex;flex-direction:column;gap:14px;">
                                <div>
                                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem;">
                                        <span style="font-weight:600;color:#12b76a;"><i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>Collected</span>
                                        <span style="font-weight:700;">RWF ${totalRevenue.toLocaleString()}</span>
                                    </div>
                                    <div style="height:8px;background:#f1f5f9;border-radius:50px;"><div style="height:100%;background:linear-gradient(90deg,#12b76a,#059669);border-radius:50px;width:${Math.round(totalRevenue/Math.max(totalRevenue+pendingRevenue,1)*100)}%;transition:width 1s;"></div></div>
                                </div>
                                <div>
                                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem;">
                                        <span style="font-weight:600;color:#f59e0b;"><i class="fa-solid fa-clock" style="margin-right:6px;"></i>Pending</span>
                                        <span style="font-weight:700;">RWF ${pendingRevenue.toLocaleString()}</span>
                                    </div>
                                    <div style="height:8px;background:#f1f5f9;border-radius:50px;"><div style="height:100%;background:linear-gradient(90deg,#f59e0b,#d97706);border-radius:50px;width:${Math.round(pendingRevenue/Math.max(totalRevenue+pendingRevenue,1)*100)}%;transition:width 1s;"></div></div>
                                </div>
                                <div style="border-top:1px solid #f1f5f9;padding-top:14px;display:flex;justify-content:space-between;font-weight:700;">
                                    <span style="color:var(--admin-text-muted);">Grand Total</span>
                                    <span style="color:var(--admin-sidebar-bg);font-size:1.05rem;">RWF ${(totalRevenue+pendingRevenue).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="dashboard-card">
                            <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--admin-sidebar-bg);margin-bottom:20px;"><i class="fa-solid fa-bolt" style="color:#c5a059;margin-right:8px;"></i>Quick Actions</h3>
                            <div style="display:flex;flex-direction:column;gap:10px;">
                                <button class="btn-primary" onclick="switchTab('invoices')" style="justify-content:start;"><i class="fa-solid fa-file-invoice"></i> Create New Invoice</button>
                                <button class="btn-outline" onclick="switchTab('cases')" style="text-align:left;"><i class="fa-solid fa-folder-plus" style="margin-right:8px;color:#c5a059;"></i> Open New Case</button>
                                <button class="btn-outline" onclick="switchTab('lawyerinbox')" style="text-align:left;"><i class="fa-solid fa-reply" style="margin-right:8px;color:#c5a059;"></i> Reply to Messages ${unreadMsgs > 0 ? `<span style="background:#d92d20;color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:50px;margin-left:auto;">${unreadMsgs}</span>` : ''}</button>
                                <button class="btn-outline" onclick="switchTab('appointments')" style="text-align:left;"><i class="fa-solid fa-calendar-check" style="margin-right:8px;color:#c5a059;"></i> Review Appointments</button>
                                <a href="index.html" target="_blank" class="btn-outline" style="text-align:left;text-decoration:none;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-eye" style="color:#c5a059;"></i> Preview Live Website</a><button class="btn-outline" onclick="generateMasterBackup()" style="text-align:left; margin-top:8px; color:#15803d; border-color:#bbf7d0; background:#f0fdf4;"><i class="fa-solid fa-download" style="margin-right:8px;"></i> Download Master Backup</button>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity Feed -->
                    <div class="table-container">
                        <div style="padding:20px 24px;border-bottom:1px solid var(--admin-border);display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;margin:0;">Recent Client Activity</h3>
                            <span style="font-size:0.8rem;color:var(--admin-text-muted);">Last 5 messages</span>
                        </div>
                        <div id="activityFeed" style="padding:0;">
                            <div style="text-align:center;padding:30px;color:var(--admin-text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading activity...</div>
                        </div>
                    </div>`;

                    // Render activity feed from messages
                    const feedEl = document.getElementById('activityFeed');
                    if (feedEl) {
                        const recent = messagesSnap.docs.slice(0, 6);
                        if (recent.length === 0) {
                            feedEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--admin-text-muted);">No recent activity.</div>';
                        } else {
                            feedEl.innerHTML = recent.map(doc => {
                                const m = doc.data();
                                const ago = m.createdAt ? timeAgo(m.createdAt.toDate()) : 'recently';
                                const isUnanswered = m.status !== 'answered';
                                return `<div style="display:flex;align-items:center;gap:16px;padding:14px 24px;border-bottom:1px solid #f9fafb;">
                                    <div style="width:36px;height:36px;border-radius:50%;background:${isUnanswered ? 'rgba(217,45,32,0.1)' : 'rgba(18,183,106,0.1)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <i class="fa-solid fa-comment-dots" style="color:${isUnanswered ? '#d92d20' : '#12b76a'};font-size:0.85rem;"></i>
                                    </div>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:700;font-size:0.88rem;color:#0d1b35;">${m.name || 'Client'} <span style="font-weight:400;color:#667085;">sent a message</span></div>
                                        <div style="font-size:0.8rem;color:#98a2b3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(m.question || m.message || '—').slice(0,90)}…</div>
                                    </div>
                                    <div style="font-size:0.78rem;color:#98a2b3;white-space:nowrap;">${ago}</div>
                                    ${isUnanswered ? '<span style="background:#fef2f2;color:#d92d20;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:50px;white-space:nowrap;">Needs Reply</span>' : '<span style="background:#f0fdf4;color:#12b76a;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:50px;">Answered</span>'}
                                </div>`;
                            }).join('');
                        }
                    }
                }

                // Update inbox badge
                const badge = document.getElementById('inboxBadge');
                if (badge) badge.textContent = unreadMsgs > 0 ? unreadMsgs : '';

                // Still render other tabs in background
                renderBlogList();
                renderRecentLeads();

            } catch (e) { console.error('Analytics load error:', e); }
        }

        // ── KPI card builder ─────────────────────────────────────────────────
        function kpiCard(icon, label, value, color, sub, trend) {
            return `
            <div class="dashboard-card" style="cursor:default;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:${color}18;display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid ${icon}" style="color:${color};font-size:1.1rem;"></i>
                    </div>
                </div>
                <div style="font-size:1.9rem;font-weight:800;color:var(--admin-sidebar-bg);line-height:1;">${value}</div>
                <div style="font-weight:700;color:var(--admin-sidebar-bg);margin:6px 0 4px;font-size:0.9rem;">${label}</div>
                <div style="font-size:0.78rem;color:var(--admin-text-muted);">${sub}</div>
                ${trend ? `<div style="font-size:0.75rem;color:${color};font-weight:600;margin-top:6px;">${trend}</div>` : ''}
            </div>`;
        }

        // ── Time-ago helper ──────────────────────────────────────────────────
        function timeAgo(date) {
            const secs = Math.floor((Date.now() - date) / 1000);
            if (secs < 60) return 'just now';
            if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
            if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
            return `${Math.floor(secs/86400)}d ago`;
        }



        async function renderRecentLeads() {
            const leadsBody = document.getElementById('leadsTableBody');
            if (!leadsBody) return;

            try {
                const querySnapshot = await db.collection("enquiries").orderBy("createdAt", "desc").limit(5).get();
                if (querySnapshot.empty) {
                    leadsBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No recent enquiries found.</td></tr>';
                    return;
                }

                leadsBody.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const lead = doc.data();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="font-weight: 600;">${lead.name || 'Anonymous'} ${lead.status === 'unread' ? '<span style="background:var(--admin-accent); width:8px; height:8px; display:inline-block; border-radius:50%; margin-left:5px;"></span>' : ''}</td>
                        <td style="color: var(--admin-text-muted);">${lead.service || lead.subject || 'Inquiry'}</td>
                        <td style="font-size: 0.85rem;">${lead.createdAt ? new Date(lead.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                    `;
                    leadsBody.appendChild(row);
                });
            } catch (e) {
                leadsBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #ff6b6b;">Error loading inquiries.</td></tr>';
            }
        }

        async function renderMessagesList() {
            const messagesBody = document.getElementById('messagesTableBody');
            if (!messagesBody) return;

            try {
                const querySnapshot = await db.collection("enquiries").orderBy("createdAt", "desc").get();
                if (querySnapshot.empty) {
                    messagesBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--admin-text-muted); padding: 40px;">No client messages yet.</td></tr>';
                    return;
                }

                messagesBody.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const msg = doc.data();
                    const row = document.createElement('tr');
                    const status = msg.status || 'unread';
                    const isUnread = status === 'unread';
                    const isReplied = status === 'replied';

                    row.style.background = isUnread ? 'rgba(197, 160, 89, 0.05)' : 'transparent';

                    const statusBadge = isReplied
                        ? '<span style="background:rgba(18,183,106,0.1);color:#027a48;font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:50px;">Replied</span>'
                        : isUnread
                            ? '<span style="background:rgba(197,160,89,0.12);color:#b76e00;font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:50px;">New</span>'
                            : '<span style="background:rgba(102,112,133,0.1);color:#667085;font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:50px;">Read</span>';

                    row.innerHTML = `
                        <td>
                            <div style="font-weight: 700;">${msg.name}</div>
                            <div style="font-size: 0.8rem; color: var(--admin-text-muted);">${msg.email}</div>
                            <div style="font-size: 0.8rem; color: var(--admin-text-muted);">${msg.phone || ''}</div>
                        </td>
                        <td>
                            <div style="font-weight: 600; color: var(--admin-accent);">${msg.service || 'General Inquiry'}</div>
                        </td>
                        <td style="max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${(msg.message||'').replace(/"/g,"'")}">
                            ${msg.message || '—'}
                        </td>
                        <td>${statusBadge}</td>
                        <td style="font-size: 0.85rem;">
                            ${msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleString() : 'N/A'}
                        </td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-outline reply-msg" data-id="${doc.id}" data-name="${(msg.name||'').replace(/"/g,"'")}" data-email="${msg.email}" data-service="${msg.service||''}" style="padding: 6px 10px; margin-right: 4px; color: #4361ee; border-color: #c7d0ff;" title="Reply to client"><i class="fa-solid fa-reply"></i> Reply</button>
                            <button class="btn-outline convert-case" data-id="${doc.id}" data-name="${(msg.name||'').replace(/"/g,"'")}" data-email="${msg.email}" data-service="${msg.service||'General'}" style="padding: 6px 10px; margin-right: 4px; color: #c5a059; border-color: #e8d5a3;" title="Convert to Case"><i class="fa-solid fa-folder-plus"></i></button>
                            ${isUnread ? `<button class="btn-outline mark-read" data-id="${doc.id}" style="padding: 6px 10px; margin-right: 4px;" title="Mark read"><i class="fa-solid fa-check"></i></button>` : ''}
                            <button class="btn-outline delete-msg" data-id="${doc.id}" style="color: #d92d20; border-color: #fda29b; padding: 6px 10px;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    messagesBody.appendChild(row);
                });

                // ── REPLY handler ──────────────────────────────────────────
                document.querySelectorAll('.reply-msg').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id   = btn.getAttribute('data-id');
                        const name = btn.getAttribute('data-name');
                        const email = btn.getAttribute('data-email');
                        const service = btn.getAttribute('data-service');
                        try {
                            const res = await window.showCustomModal({
                                title: `Reply to ${name}`,
                                icon: 'fa-reply',
                                contentHTML: `
                                    <div class="form-group mb-md">
                                        <label>Sending to</label>
                                        <input type="text" class="form-control" value="${email}" readonly style="background:#f9fafb;color:#667085;">
                                    </div>
                                    <div class="form-group">
                                        <label for="replyBody">Your Reply *</label>
                                        <textarea id="replyBody" class="form-control" rows="5" placeholder="Type your professional response here..."></textarea>
                                    </div>`,
                                confirmText: 'Send Reply'
                            });
                            const replyText = (res?.replyBody || '').trim();
                            if (!replyText) return showToast('Please type a reply.', 'error');

                            // Send via Formspree as reply
                            try {
                                await fetch('https://formspree.io/f/mrbgknqv', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                    body: JSON.stringify({
                                        _replyto: email,
                                        email: email,
                                        subject: `[KALTO LAW] Re: ${service} — Your Inquiry`,
                                        message: `Dear ${name},\n\n${replyText}\n\nBest regards,\nKALTO LAW AND SERVICES LTD\n+250 790 750 000`
                                    })
                                });
                            } catch(e) { console.warn('Email send failed, still marking replied:', e); }

                            await db.collection('enquiries').doc(id).update({ status: 'replied', adminReply: replyText, repliedAt: firebase.firestore.FieldValue.serverTimestamp() });
                            showToast(`Reply sent to ${name}!`);
                            renderMessagesList();
                        } catch(e) { /* cancelled */ }
                    });
                });

                // ── APPROVE → CASE handler ─────────────────────────────────
                document.querySelectorAll('.convert-case').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-id');
                        const clientName = btn.getAttribute('data-name');
                        const service = btn.getAttribute('data-service');
                        try {
                            await showConfirmModal('Approve → Create Case?', `This will approve the message and immediately create a new case file for ${clientName} in the Case Manager.`);
                            const trackingCode = 'KL-' + Math.random().toString(36).substr(2,4).toUpperCase() + '-' + Math.floor(1000 + Math.random()*9000);
                            await db.collection('cases').add({
                                clientName,
                                description: `Approved via contact form — ${service}`,
                                trackingCode,
                                status: 'Initiated',
                                documents: [],
                                enquiryId: id,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            
                            // Mark message as approved
                            await db.collection('enquiries').doc(id).update({ status: 'approved' });
                            
                            showToast(`✅ Case Created! Tracking Code: ${trackingCode}`);
                            
                            // Auto-navigate to Case Manager tab
                            window.switchTab('cases');
                            
                            renderMessagesList();
                            renderRecentLeads();
                        } catch(e) { /* cancelled */ }
                    });
                });
                // ── MARK READ handler ──────────────────────────────────────
                document.querySelectorAll('.mark-read').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-id');
                        await db.collection('enquiries').doc(id).update({ status: 'read' });
                        showToast('Message marked as read');
                        renderMessagesList();
                        renderRecentLeads();
                    });
                });

                // ── DELETE handler ─────────────────────────────────────────
                document.querySelectorAll('.delete-msg').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        try {
                            await showConfirmModal('Delete Inquiry?', 'This will permanently remove this client message.');
                            await db.collection('enquiries').doc(btn.getAttribute('data-id')).delete();
                            showToast('Message deleted');
                            renderMessagesList();
                            renderRecentLeads();
                        } catch(e) { /* cancelled */ }
                    });
                });

            } catch (e) {
                console.error('Messages Load Error:', e);
                messagesBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff6b6b; padding: 20px;">Error connecting to messages database.</td></tr>';
            }
        }

        // ── EXPORT MESSAGES CSV ──────────────────────────────────────────────
        window.exportMessagesCSV = async function() {
            try {
                const snap = await db.collection('enquiries').orderBy('createdAt','desc').get();
                const rows = [['Name','Email','Phone','Service','Message','Status','Date']];
                snap.forEach(doc => {
                    const d = doc.data();
                    const date = d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : 'N/A';
                    rows.push([d.name||'',d.email||'',d.phone||'',d.service||'',`"${(d.message||'').replace(/"/g,'""')}"`,d.status||'',date]);
                });
                const csv = rows.map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], {type:'text/csv'});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `kalto-messages-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
            } catch(e) { showToast('Export failed.', 'error'); }
        };

        async function renderBlogList() {
            if (!blogTableBody) return;
            blogTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading insights...</td></tr>';
            try {
                const querySnapshot = await db.collection("insights").orderBy("createdAt", "desc").get();
                if (querySnapshot.empty) {
                    blogTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--admin-text-muted);">No insights published yet. Click "Write New Insight" to get started.</td></tr>';
                    return;
                }
                blogTableBody.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const post = doc.data();
                    const hasContent = post.content && post.content.length > 0;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <div style="font-weight:600;">${post.title}</div>
                            ${hasContent ? '<span style="font-size:0.75rem;background:rgba(18,183,106,0.1);color:#12b76a;padding:2px 8px;border-radius:50px;font-weight:600;"><i class="fa-solid fa-file-lines" style="margin-right:4px;"></i>Full Article</span>' : '<span style="font-size:0.75rem;background:rgba(102,112,133,0.1);color:#667085;padding:2px 8px;border-radius:50px;">Link Only</span>'}
                        </td>
                        <td><span style="background:rgba(197,160,89,0.1);color:var(--admin-accent);padding:4px 12px;border-radius:50px;font-size:0.8rem;font-weight:600;">${post.category || 'General'}</span></td>
                        <td style="color:var(--admin-text-muted);">${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : 'N/A'}</td>
                        <td style="text-align:right;white-space:nowrap;display:flex;gap:8px;justify-content:flex-end;">
                            <a href="blog-post.html?id=${doc.id}" target="_blank" class="btn-outline" title="Preview post" style="padding:8px 12px;font-size:0.8rem;text-decoration:none;"><i class="fa-solid fa-eye"></i></a>
                            <button class="btn-outline edit-post" data-id="${doc.id}" title="Edit post" style="padding:8px 12px;"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-outline delete-post" data-id="${doc.id}" style="color:#d92d20;border-color:#fda29b;padding:8px 12px;" title="Delete post"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    blogTableBody.appendChild(row);
                });

                // Edit handlers
                document.querySelectorAll('.edit-post').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-id');
                        const snap = await db.collection('insights').doc(id).get();
                        showBlogEditor({ id, ...snap.data() });
                    });
                });

                document.querySelectorAll('.delete-post').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        try {
                            await showConfirmModal("Delete Legal Insight?", "This will permanently remove this article from the public website.");
                            await db.collection("insights").doc(btn.getAttribute('data-id')).delete();
                            showToast("Insight deleted");
                            renderBlogList();
                            loadInitialData();
                        } catch (e) { /* Cancelled */ }
                    });
                });
            } catch (e) {
                blogTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ff6b6b;padding:20px;">Error loading insights. Check Firestore connection.</td></tr>';
            }
        }


        const cmsSeedBtn = document.getElementById('cmsSeedBtn');

        if (cmsSaveBtn) {
            cmsSaveBtn.addEventListener('click', async () => {
                const docId = cmsSelector.value;
                const newContent = cmsTextarea.value;
                cmsSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                try {
                    await db.collection("website_content").doc(docId).set({
                        content: newContent,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showToast("Live content updated successfully!");
                } catch (err) { showToast("Error saving. Check Firestore rules.", "error"); }
                finally { cmsSaveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Update Live Website'; }
            });
        }

        if (cmsSeedBtn) {
            cmsSeedBtn.addEventListener('click', async () => {
                try {
                    await showConfirmModal("Sync Website Content?", "This will link your website's current text to the database for live editing. Proceed?");
                } catch (e) { return; }

                cmsSeedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

                const initialContent = {
                    'about_mission_1': "At KALTO LAW, we are dedicated to providing tier-one legal advising with a focus on strategic results. We believe that every client deserves a champion who combines legal expertise with unwavering ethical standards.",
                    'about_mission_2': "Our philosophy is built on the pillars of Integrity, Excellence, and Strategy. We don't just practice law; we craft solutions that secure your future.",
                    'about_founder_bio': "With decades of unmatched experience in high-stakes litigation, corporate law, and complex dispute resolution, KWIZERA Benjamin established KALTO LAW with a singular vision: to deliver relentless, elite legal advocacy. He personally guides the firm's strategic direction, ensuring every client receives the formidable advising necessary to secure and protect their legacy.",
                    'practice_1_desc': "Strategic counsel for scaling businesses, navigating complex regulations, and structuring mergers with precision. We ensure your corporate governance is flawlessly executed.",
                    'practice_4_desc': "Expert guidance on establishment of new company, shareholder matters, company resolution processing, and amendment filings. We build a strong foundation for your business.",
                    'practice_5_desc': "Simple and clear support for your everyday business transactions, securing vendor agreements, and helping your business grow smoothly.",
                    'practice_6_desc': "Efficient and private problem-solving through consultation and mediation. We pursue collaborative solutions that save time and protect relationships.",
                    'practice_7_desc': "Supportive advice for family situations, complete divorce proceedings, complex assets division, and succession matters. We prioritize your family's stability and care.",
                    'practice_8_desc': "Integrated solutions for property transactions, zoning disputes, and securing inheritances. We protect both your current investments and your future legacy.",
                    'practice_9_desc': "Clear guidance on rules, drafting contract agreements for employees, and resolving issues to build a productive workplace.",
                    'practice_10_desc': "Defending your rights when buying goods or services. We help with unfair practices, product liability, and lack of conformity of product to ensure fairness.",
                    'practice_11_desc': "Comprehensive tax planning and compliance services. We navigate complex regulations to optimize your financial strategies."
                };

                try {
                    const batch = db.batch();
                    for (const [id, content] of Object.entries(initialContent)) {
                        const ref = db.collection("website_content").doc(id);
                        batch.set(ref, {
                            content,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                    await batch.commit();
                    showToast("Website synced to database!");
                    cmsSelector.dispatchEvent(new Event('change')); // Refresh view
                } catch (e) {
                    console.error("Sync error:", e);
                    showToast("Sync failed. Check connection.", "error");
                } finally {
                    cmsSeedBtn.innerHTML = '<i class="fa-solid fa-sync"></i> Sync Initial Content';
                }
            });
        }

        if (cmsSelector) {
            cmsSelector.addEventListener('change', async () => {
                const docId = cmsSelector.value;
                cmsTextarea.classList.add('loading-shimmer');
                cmsTextarea.value = ""; // Clear text to show shimmer clearly

                try {
                    const docSnap = await db.collection("website_content").doc(docId).get();
                    cmsTextarea.value = docSnap.exists ? docSnap.data().content : "";
                } catch (err) {
                    console.error("Fetch error:", err);
                    showToast("Error loading content", "error");
                } finally {
                    cmsTextarea.classList.remove('loading-shimmer');
                }
            });
        }

        const blogListView = document.getElementById('blogListView');
        const blogEditorView = document.getElementById('blogEditorView');
        const backToListBtn = document.getElementById('backToListBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const publishPostBtn = document.getElementById('publishPostBtn');
        const editorHeading = document.getElementById('editorHeading');
        const editorStatus = document.getElementById('editorStatus');
        const publishBtnText = document.getElementById('publishBtnText');
        const editingPostIdField = document.getElementById('editingPostId');

        function showBlogEditor(post = null) {
            blogListView.style.display = 'none';
            blogEditorView.style.display = 'block';
            editorStatus.textContent = '';
            if (post) {
                editorHeading.textContent = 'Edit Legal Insight';
                editingPostIdField.value = post.id;
                document.getElementById('postTitle').value = post.title || '';
                document.getElementById('postCategory').value = post.category || 'Corporate Law';
                document.getElementById('postCoverImage').value = post.coverImage || '';
                document.getElementById('postExcerpt').value = post.description || '';
                document.getElementById('postContent').value = post.content || '';
                publishBtnText.textContent = 'Update Insight';
            } else {
                editorHeading.textContent = 'Write New Legal Insight';
                editingPostIdField.value = '';
                document.getElementById('postTitle').value = '';
                document.getElementById('postCategory').value = 'Corporate Law';
                document.getElementById('postCoverImage').value = '';
                document.getElementById('postExcerpt').value = '';
                document.getElementById('postContent').value = '';
                publishBtnText.textContent = 'Publish Insight';
            }
        }

        function showBlogList() {
            blogEditorView.style.display = 'none';
            blogListView.style.display = 'block';
            renderBlogList();
        }

        if (newPostBtn) newPostBtn.addEventListener('click', () => showBlogEditor(null));
        if (backToListBtn) backToListBtn.addEventListener('click', showBlogList);
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', showBlogList);

        if (publishPostBtn) {
            publishPostBtn.addEventListener('click', async () => {
                const title = document.getElementById('postTitle').value.trim();
                const category = document.getElementById('postCategory').value;
                const coverImage = document.getElementById('postCoverImage').value.trim();
                const description = document.getElementById('postExcerpt').value.trim();
                const content = document.getElementById('postContent').value.trim();
                const editingId = editingPostIdField.value;

                if (!title) { showToast('Please enter an article title.', 'error'); return; }
                if (!content) { showToast('Please write some article content.', 'error'); return; }

                publishPostBtn.disabled = true;
                publishBtnText.textContent = 'Saving...';
                editorStatus.textContent = '';

                const postData = { title, category, coverImage, description, content };

                try {
                    if (editingId) {
                        await db.collection('insights').doc(editingId).update({
                            ...postData,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        editorStatus.textContent = '✓ Insight updated successfully!';
                    } else {
                        await db.collection('insights').add({
                            ...postData,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        editorStatus.textContent = '✓ Insight published to website!';
                    }
                    showToast(editingId ? 'Insight updated!' : 'New insight published!');
                    loadInitialData();
                } catch (e) {
                    console.error('Publish error:', e);
                    showToast('Error saving. Check Firestore rules.', 'error');
                } finally {
                    publishPostBtn.disabled = false;
                    publishBtnText.textContent = editingId ? 'Update Insight' : 'Publish Insight';
                }
            });
        }


                

        async function renderDocumentsTab() {
            const openGrid = document.getElementById('openCasesGrid');
            const closedGrid = document.getElementById('closedCasesGrid');
            if (!openGrid && !closedGrid) return;

            const loadingHTML = `<div style="text-align:center;padding:40px;color:var(--admin-text-muted);grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
            if (openGrid) openGrid.innerHTML = loadingHTML;
            if (closedGrid) closedGrid.innerHTML = loadingHTML;

            try {
                const snap = await db.collection('cases').orderBy('lastUpdated', 'desc').get();
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const open = all.filter(c => c.status !== 'Closed' && c.status !== 'Done');
                const closed = all.filter(c => c.status === 'Closed' || c.status === 'Done');

                function buildDocCard(c) {
                    const docs = c.documents || [];
                    const date = c.lastUpdated ? new Date(c.lastUpdated.toDate()).toLocaleDateString('en-RW') : 'N/A';
                    const docsHTML = docs.length
                        ? docs.map(d => `<a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e4e7ec;border-radius:8px;text-decoration:none;color:#0d1b35;font-size:0.82rem;margin-bottom:6px;"><i class="fa-solid fa-file-pdf" style="color:#d92d20;"></i>${d.name}</a>`).join('')
                        : `<div style="text-align:center;padding:12px;color:#98a2b3;font-size:0.82rem;">No documents attached.</div>`;
                    return `
                        <div style="background:#fff;border:1px solid var(--admin-border);border-radius:16px;padding:24px;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
                                <div>
                                    <div style="font-weight:700;font-size:1rem;color:#0d1b35;">${c.clientName}</div>
                                    <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:0.8rem;color:#4361ee;">${c.trackingCode}</code>
                                </div>
                                <span style="background:${c.status==='Closed'?'rgba(18,183,106,0.1)':'rgba(197,160,89,0.1)'};color:${c.status==='Closed'?'#027a48':'#b45309'};padding:3px 10px;border-radius:50px;font-size:0.75rem;font-weight:700;">${c.status}</span>
                            </div>
                            <div style="font-size:0.82rem;color:#667085;margin-bottom:12px;">${c.description || '—'}</div>
                            <div style="font-size:0.75rem;color:#98a2b3;margin-bottom:16px;">Last updated: ${date}</div>
                            <div style="border-top:1px solid #f1f5f9;padding-top:14px;">
                                <div style="font-size:0.75rem;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Documents</div>
                                ${docsHTML}
                            </div>
                        </div>`;
                }

                if (openGrid) openGrid.innerHTML = open.length ? open.map(buildDocCard).join('') : `<div style="text-align:center;padding:60px;color:var(--admin-text-muted);grid-column:1/-1;"><i class="fa-solid fa-folder-open" style="font-size:2.5rem;opacity:0.2;display:block;margin-bottom:12px;"></i>No open cases.</div>`;
                if (closedGrid) closedGrid.innerHTML = closed.length ? closed.map(buildDocCard).join('') : `<div style="text-align:center;padding:60px;color:var(--admin-text-muted);grid-column:1/-1;"><i class="fa-solid fa-box-archive" style="font-size:2.5rem;opacity:0.2;display:block;margin-bottom:12px;"></i>No closed cases yet.</div>`;
            } catch(e) {
                console.error('Documents tab error:', e);
            }
        }

        // ── CASE MANAGER LOGIC ────────────────────────────────────────────────
        const newCaseBtn = document.getElementById('newCaseBtn');

        async function renderCasesList() {
            if (!casesTableBody) return;
            casesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Retrieving legal case files...</td></tr>';
            try {
                const querySnapshot = await db.collection("cases").orderBy("lastUpdated", "desc").get();
                if (querySnapshot.empty) {
                    casesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 40px;">No cases found. Create your first case above.</td></tr>';
                    return;
                }

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const row = document.createElement('tr');
                    const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated.toDate()).toLocaleDateString() : 'N/A';
                    
                    row.innerHTML = `
                        <td style="font-weight: 600;">${data.clientName}</td>
                        <td style="display: flex; align-items: center; gap: 8px;">
                            <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-family: monospace;">${data.trackingCode}</code>
                            <div class="share-actions" style="display: flex; gap: 4px;">
                                <button class="btn-copy copy-tracking" data-code="${data.trackingCode}" title="Copy Code" style="background: none; border: none; color: var(--color-accent); cursor: pointer; padding: 4px;"><i class="fa-regular fa-copy"></i></button>
                                <button class="btn-share share-email" data-code="${data.trackingCode}" data-name="${data.clientName}" title="Share via Email" style="background: none; border: none; color: #ea4335; cursor: pointer; padding: 4px;"><i class="fa-solid fa-envelope"></i></button>
                                <button class="btn-share share-whatsapp" data-code="${data.trackingCode}" data-name="${data.clientName}" title="Share via WhatsApp" style="background: none; border: none; color: #25d366; cursor: pointer; padding: 4px;"><i class="fa-brands fa-whatsapp"></i></button>
                                <button class="btn-share share-sms" data-code="${data.trackingCode}" data-name="${data.clientName}" title="Share via SMS" style="background: none; border: none; color: #007aff; cursor: pointer; padding: 4px;"><i class="fa-solid fa-comment-sms"></i></button>
                            </div>
                        </td>
                        <td><span class="status-badge status-${(data.status || 'processing').toLowerCase()}" style="padding: 4px 12px; border-radius: 50px;">${data.status}</span></td>
                        <td>${lastUpdated}</td>
                        <td style="text-align: right; white-space: nowrap;">
                             <button class="btn-outline edit-case" data-id="${doc.id}" title="Update Case"><i class="fa-solid fa-pen-to-square"></i></button>
                             <button class="btn-outline delete-case" data-id="${doc.id}" style="color: #d92d20; border-color: #fda29b;" title="Delete Case"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    casesTableBody.appendChild(row);
                });

                // Attach Handlers
                document.querySelectorAll('.copy-tracking').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.getAttribute('data-code');
                        navigator.clipboard.writeText(code).then(() => {
                            const icon = btn.querySelector('i');
                            icon.className = 'fa-solid fa-check';
                            showToast("Tracking code copied to clipboard!");
                            setTimeout(() => icon.className = 'fa-regular fa-copy', 2000);
                        });
                    });
                });

                document.querySelectorAll('.share-email').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.getAttribute('data-code');
                        const name = btn.getAttribute('data-name');
                        const subject = encodeURIComponent("Secure Case Tracking Code - KALTO LAW");
                        const body = encodeURIComponent(`Dear ${name},\n\nYour case has been registered with KALTO LAW AND SERVICES LTD. You can track your proceedings and access official documentation through our secure portal:\n\nTrack here: https://kalto-law.web.app/track-case.html\nYour Unique Tracking Code: ${code}\n\nPlease keep this code confidential. If you require further assistance, contact us at +250 790 750 000.\n\nBest regards,\nKALTO LAW Team`);
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    });
                });

                document.querySelectorAll('.share-whatsapp').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.getAttribute('data-code');
                        const name = btn.getAttribute('data-name');
                        const message = encodeURIComponent(`Hello *${name}*, your case at *KALTO LAW* is registered. Track your progress here: https://kalto-law.web.app/track-case.html\n\nYour Tracking Code: *${code}*\n\nKeep this code secure. Contact us if you have any questions.`);
                        window.open(`https://wa.me/?text=${message}`, '_blank');
                    });
                });

                document.querySelectorAll('.share-sms').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.getAttribute('data-code');
                        const name = btn.getAttribute('data-name');
                        const message = encodeURIComponent(`Hello ${name}, your KALTO LAW case tracking code is: ${code}\n\nTrack here: https://kalto-law.web.app/track-case.html`);
                        window.location.href = `sms:?body=${message}`;
                    });
                });
                document.querySelectorAll('.edit-case').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-id');
                        const docSnapshot = await db.collection("cases").doc(id).get();
                        const data = docSnapshot.data();
                        
                        try {
                            const res = await window.showCustomModal({
                                title: `Manage Case: ${data.clientName}`,
                                icon: 'fa-user-gear',
                                contentHTML: `
                                    <div class="form-group mb-md">
                                        <label for="actionType">Select Action</label>
                                        <select id="actionType" class="form-control">
                                            <option value="status">Update Legal Status</option>
                                            <option value="doc">Attach Official Document</option>
                                            <option value="desc">Modify Description</option>
                                        </select>
                                    </div>
                                    <div id="dynamicFields">
                                        <!-- Fields change based on selection -->
                                        <div id="statusField">
                                            <label>Current Status</label>
                                            <select id="newStatus" class="form-control">
                                                <option value="Initiated" ${data.status === 'Initiated' ? 'selected' : ''}>Initiated</option>
                                                <option value="Review" ${data.status === 'Review' ? 'selected' : ''}>In Review</option>
                                                <option value="Approved" ${data.status === 'Approved' ? 'selected' : ''}>Approved</option>
                                                <option value="Rejected" ${data.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                                <option value="Closed" ${data.status === 'Closed' ? 'selected' : ''}>Closed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <script>
                                        // We'll manage field toggling via manual injection or simple JS
                                        setTimeout(() => {
                                            const sel = document.getElementById('actionType');
                                            const dyn = document.getElementById('dynamicFields');
                                            sel.onchange = () => {
                                                if(sel.value === 'status') {
                                                    dyn.innerHTML = '<label>Update Status</label><select id="newStatus" class="form-control"><option value="Initiated">Initiated</option><option value="Review">In Review</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Closed">Closed</option></select>';
                                                } else if(sel.value === 'doc') {
                                                    dyn.innerHTML = '<div class="form-group mb-md"><label>Document Label</label><input type="text" id="docName" class="form-control" placeholder="e.g. Formal Approval PDF"></div><div class="form-group"><label>PDF URL</label><input type="url" id="docUrl" class="form-control" placeholder="https://..."></div>';
                                                } else {
                                                    dyn.innerHTML = '<label>Case Description</label><textarea id="newDesc" class="form-control" rows="4">${data.description.replace(/'/g, "\\'")}</textarea>';
                                                }
                                            };
                                        }, 100);
                                    </script>
                                `,
                                confirmText: 'Process Update'
                            });

                            if (res) {
                                if (res.actionType === 'status' && res.newStatus) {
                                    await db.collection("cases").doc(id).update({
                                        status: res.newStatus,
                                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                    showToast("Case status updated!");
                                } else if (res.actionType === 'doc' && res.docName && res.docUrl) {
                                    const newDocs = [...(data.documents || []), { name: res.docName, url: res.docUrl }];
                                    await db.collection("cases").doc(id).update({
                                        documents: newDocs,
                                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                    showToast("Document attached to case!");
                                } else if (res.actionType === 'desc' && res.newDesc) {
                                    await db.collection("cases").doc(id).update({
                                        description: res.newDesc,
                                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                    showToast("Description updated!");
                                }
                                renderCasesList();
                            }
                        } catch (e) {
                            if (e) console.error("Edit Case error:", e);
                        }
                    });
                });

                document.querySelectorAll('.delete-case').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        try {
                            await showConfirmModal("Delete Case?", "This will permanently remove the client and all their case history. This action cannot be undone.");
                            await db.collection("cases").doc(btn.getAttribute('data-id')).delete();
                            showToast("Case record deleted");
                            renderCasesList();
                            loadInitialData();
                        } catch (e) { /* Cancelled */ }
                    });
                });

            } catch (e) {
                casesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ff6b6b; padding: 20px;">Database Error. Check Firestore connectivity.</td></tr>';
            }
        }

        async function renderAppointmentsList() {
            if (!appointmentsTableBody) return;
            appointmentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> Retrieving consultation schedule...</td></tr>';

            try {
                                const snapshot = await db.collection("appointments").orderBy("createdAt", "desc").get();

                // Initialize FullCalendar
                const calendarEl = document.getElementById('calendar');
                if (calendarEl && window.FullCalendar && !window.calendarInstance) {
                    window.calendarInstance = new FullCalendar.Calendar(calendarEl, {
                        initialView: 'dayGridMonth',
                        height: 300,
                        contentHeight: 260,
                        aspectRatio: 2.5,
                        headerToolbar: {
                            left: 'prev,next',
                            center: 'title',
                            right: 'today'
                        },
                        dayMaxEvents: 2,
                        displayEventTime: false,
                        eventDisplay: 'block',
                        dayCellClassNames: 'fc-compact-day',
                        events: [],
                        eventClick: function(info) {
                            showToast('Appointment: ' + info.event.title);
                        }
                    });
                    window.calendarInstance.render();
                }

                if (window.calendarInstance) {
                    window.calendarInstance.removeAllEvents();
                }

                if (snapshot.empty) {
                    appointmentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No consultations scheduled yet.</td></tr>';
                    return;
                }

                appointmentsTableBody.innerHTML = '';
                snapshot.forEach(doc => {
                    const appt = doc.data();
                    const date = appt.createdAt ? appt.createdAt.toDate().toLocaleDateString() : 'N/A';
                                        const statusClass = appt.status?.toLowerCase() || 'pending';

                    if (window.calendarInstance) {
                        let isoDate = appt.date;
                        if (appt.date && appt.date.includes('/')) {
                            const parts = appt.date.split('/');
                            if (parts.length === 3) isoDate = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
                        } else if (appt.date && appt.date.includes('-')) {
                            isoDate = appt.date;
                        }

                        let color = '#3b82f6';
                        if (statusClass === 'confirmed') color = '#10b981';
                        if (statusClass === 'completed') color = '#64748b';
                        if (statusClass === 'cancelled') color = '#ef4444';

                        window.calendarInstance.addEvent({
                            id: doc.id,
                            title: appt.name + ' - ' + appt.service,
                            start: isoDate,
                            backgroundColor: color,
                            borderColor: color
                        });
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <div style="font-weight: 600;">${appt.name}</div>
                            <div style="font-size: 0.8rem; color: #667085;">${appt.email}</div>
                        </td>
                        <td><span class="badge" style="background: #f2f4f7; color: #344054;">${appt.service}</span></td>
                        <td>
                            <div style="font-weight: 500;">${appt.date}</div>
                            <div style="font-size: 0.8rem; color: #667085;">${appt.time}</div>
                        </td>
                        <td><span class="status-badge status-${statusClass}">${appt.status}</span></td>
                        <td style="text-align: right;">
                            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                <button class="btn-outline update-appt" data-id="${doc.id}" data-status="Confirmed" style="font-size: 0.75rem; padding: 4px 8px;">Confirm</button>
                                <button class="btn-outline update-appt" data-id="${doc.id}" data-status="Completed" style="font-size: 0.75rem; padding: 4px 8px;">Complete</button>
                                <button class="btn-outline update-appt" data-id="${doc.id}" data-status="Cancelled" style="color: #d92d20; font-size: 0.75rem; padding: 4px 8px;">Cancel</button>
                            </div>
                        </td>
                    `;
                    appointmentsTableBody.appendChild(row);
                });

                // Event Listeners for appointment updates
                document.querySelectorAll('.update-appt').forEach(btn => {
                    btn.onclick = async () => {
                        const id = btn.getAttribute('data-id');
                        const newStatus = btn.getAttribute('data-status');
                        await db.collection("appointments").doc(id).update({ status: newStatus });
                        showToast(`Appointment ${newStatus}`);
                        renderAppointmentsList();
                    };
                });

            } catch (e) {
                console.error("Appointments Error:", e);
                appointmentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ff6b6b; padding: 20px;">Error loading schedule.</td></tr>';
            }
        }

        if (newCaseBtn) {
            newCaseBtn.addEventListener('click', async () => {
                try {
                    const res = await window.showCustomModal({
                        title: 'Register New Legal Case',
                        icon: 'fa-folder-plus',
                        contentHTML: `
                            <div class="form-group mb-md">
                                <label for="clientName">Full Client Name</label>
                                <input type="text" id="clientName" class="form-control" placeholder="e.g. John Doe" required>
                            </div>
                            <div class="form-group mb-md">
                                <label for="clientPhone">Client Phone Number</label>
                                <input type="tel" id="clientPhone" class="form-control" placeholder="+250790000000">
                            </div>
                            <div class="form-group">
                                <label for="caseDesc">Case Description / Matter</label>
                                <textarea id="caseDesc" class="form-control" rows="3" placeholder="Description of the legal matter..."></textarea>
                            </div>`,
                        confirmText: 'Create Case'
                    });
                    if (res && res.clientName) {
                        const trackingCode = 'KL-' + Math.random().toString(36).substr(2,4).toUpperCase() + '-' + Math.floor(1000 + Math.random()*9000);
                        await db.collection('cases').add({
                            clientName: res.clientName, clientPhone: res.clientPhone||'',
                            description: res.caseDesc||'New legal matter.',
                            trackingCode, status: 'Initiated', documents: [],
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        showToast(`Case Created! Code: ${trackingCode}`);
                        renderCasesList();
                    }
                } catch(e) { if (e) console.error('Case create error:', e); }
            });
        }

        // Billing: renderBillingTab / renderReceiptsList / generateReceiptPDF / switchBillingSubtab defined above.

        // --- MARKETING & UPLOADS LOGIC ---
        async function renderMarketingList() {
            const subBody = document.getElementById('subscribersTableBody');
            const tplBody = document.getElementById('templatesTableBody');
            if (subBody) {
                try {
                    const subs = await db.collection("newsletter_subscribers").orderBy("timestamp", "desc").get();
                    if (subs.empty) {
                        subBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--admin-text-muted); padding: 20px;">No subscribers yet.</td></tr>';
                    } else {
                        subBody.innerHTML = '';
                        subs.forEach(doc => {
                            const data = doc.data();
                            subBody.innerHTML += `<tr><td><div style="font-weight: 600;">${data.email}</div></td><td>${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'N/A'}</td></tr>`;
                        });
                    }
                } catch (e) { subBody.innerHTML = '<tr><td colspan="2">Error loading</td></tr>'; }
            }

            if (tplBody) {
                try {
                    const tpls = await db.collection("template_requests").orderBy("timestamp", "desc").get();
                    if (tpls.empty) {
                        tplBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--admin-text-muted); padding: 20px;">No requests yet.</td></tr>';
                    } else {
                        tplBody.innerHTML = '';
                        tpls.forEach(doc => {
                            const data = doc.data();
                            tplBody.innerHTML += `<tr>
                                <td><div style="font-weight: 600;">${data.name}</div><div style="font-size:0.8rem; color:#667085;">${data.email}</div></td>
                                <td><span style="background:rgba(197,160,89,0.1); color:var(--admin-accent); padding:4px 8px; border-radius:4px; font-weight:600; font-size:0.85rem;">${data.template}</span></td>
                                <td>${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'N/A'}</td>
                            </tr>`;
                        });
                    }
                } catch (e) { tplBody.innerHTML = '<tr><td colspan="3">Error loading</td></tr>'; }
            }
        }

        async function renderUploadsList(filterCode = '') {
            const upBody = document.getElementById('uploadsTableBody');
            const countBadge = document.getElementById('uploadsCount');
            if (!upBody) return;
            upBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading documents...</td></tr>';
            try {
                const snap = await db.collection("client_uploads").orderBy("uploadedAt", "desc").get();
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const filtered = filterCode
                    ? all.filter(d => (d.caseCode || '').toLowerCase().includes(filterCode.toLowerCase()) || (d.fileName || '').toLowerCase().includes(filterCode.toLowerCase()))
                    : all;

                if (countBadge) countBadge.textContent = all.length;

                if (filtered.length === 0) {
                    upBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--admin-text-muted);padding:40px;">${filterCode ? 'No documents match your search.' : 'No client uploads yet.'}</td></tr>`;
                    return;
                }

                upBody.innerHTML = '';
                filtered.forEach(data => {
                    const ext = (data.fileName || '').split('.').pop().toLowerCase();
                    const iconMap = { pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word', jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image' };
                    const colorMap = { pdf: '#d92d20', doc: '#1a56db', docx: '#1a56db', jpg: '#12b76a', jpeg: '#12b76a', png: '#12b76a' };
                    const icon = iconMap[ext] || 'fa-file';
                    const color = colorMap[ext] || '#667085';
                    const date = data.uploadedAt ? new Date(data.uploadedAt.toDate()).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
                    const size = data.fileSize ? `${(data.fileSize / 1024).toFixed(0)} KB` : 'N/A';
                    const status = data.approvalStatus || 'pending';
                    const statusBadge = status === 'approved' ? `<span style="background:rgba(18,183,106,0.1);color:#027a48;padding:2px 8px;border-radius:50px;font-size:0.75rem;font-weight:600;"><i class="fa-solid fa-check"></i> Approved</span>` : `<span style="background:rgba(247,144,9,0.1);color:#b45309;padding:2px 8px;border-radius:50px;font-size:0.75rem;font-weight:600;">Pending</span>`;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-weight:700;font-family:monospace;font-size:0.85rem;">${data.caseCode}</code>
                        </td>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:36px;height:36px;background:${color}15;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                    <i class="fa-solid ${icon}" style="color:${color};font-size:1rem;"></i>
                                </div>
                                <div style="font-weight:600;color:#0d1b35;font-size:0.9rem;">${data.fileName}</div>
                            </div>
                        </td>
                        <td style="color:#667085;font-size:0.85rem;">${date}</td>
                        <td style="color:#667085;font-size:0.85rem;">${size}</td>
                        <td>${statusBadge}</td>
                        <td style="text-align:right;white-space:nowrap;">
                            ${status !== 'approved' ? `<button class="btn-primary approve-upload" data-id="${data.id}" style="padding:6px 12px;font-size:0.8rem;margin-right:6px;" title="Approve & Attach to Case"><i class="fa-solid fa-check"></i> Approve</button>` : ''}
                            <a href="${data.url}" target="_blank" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;text-decoration:none;margin-right:6px;" title="Download"><i class="fa-solid fa-download"></i></a>
                            <button class="btn-outline delete-upload" data-id="${data.id}" style="color:#d92d20;border-color:#fda29b;padding:6px 10px;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    upBody.appendChild(row);
                });

                // Approve handler
                document.querySelectorAll('.approve-upload').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        try {
                            await db.collection('client_uploads').doc(btn.getAttribute('data-id')).update({ approvalStatus: 'approved' });
                            showToast('✅ Document approved and attached to case');
                            renderUploadsList(document.getElementById('uploadsSearch')?.value || '');
                        } catch(e) { console.error('Approval failed:', e); }
                    });
                });

                // Delete handlers
                document.querySelectorAll('.delete-upload').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        try {
                            await showConfirmModal('Delete Document?', 'This permanently removes the uploaded document record. The file in storage will remain but become unlinked.');
                            await db.collection('client_uploads').doc(btn.getAttribute('data-id')).delete();
                            showToast('Document record removed.');
                            renderUploadsList(document.getElementById('uploadsSearch')?.value || '');
                        } catch (e) { /* cancelled */ }
                    });
                });

            } catch (e) {
                upBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ff6b6b;padding:20px;">Error loading uploads.</td></tr>';
            }
        }

        // Add to switchTab logic
        const originalSwitchTab = window.switchTab;
        window.switchTab = function(tabName) {
            originalSwitchTab(tabName);
            if (tabName === 'billing') renderBillingTab();
            if (tabName === 'documents') renderDocumentsTab();
            if (tabName === 'uploads') renderUploadsList();
            if (tabName === 'lawyerinbox') renderLawyerInbox();
            if (tabName === 'clientaccounts') renderClientAccounts();
            if (tabName === 'tasks') renderTasksList();
        };


        // ── DOCUMENTS TAB (OPEN VS CLOSED CASES) ─────────────────────────────
        window.switchDocSubtab = function(sub) {
            const openView = document.getElementById('openCasesView');
            const closedView = document.getElementById('closedCasesView');
            const btnOpen = document.getElementById('docSubtabOpen');
            const btnClosed = document.getElementById('docSubtabClosed');
            
            if (!openView) return;
            
            if (sub === 'open') {
                openView.style.display = 'block'; closedView.style.display = 'none';
                btnOpen.style.borderBottomColor = 'var(--admin-accent)';
                btnOpen.style.color = 'var(--admin-sidebar-bg)';
                btnClosed.style.borderBottomColor = 'transparent';
                btnClosed.style.color = 'var(--admin-text-muted)';
            } else {
                openView.style.display = 'none'; closedView.style.display = 'block';
                btnClosed.style.borderBottomColor = 'var(--admin-accent)';
                btnClosed.style.color = 'var(--admin-sidebar-bg)';
                btnOpen.style.borderBottomColor = 'transparent';
                btnOpen.style.color = 'var(--admin-text-muted)';
            }
        };

        async function renderDocumentsTab() {
            const gridOpen = document.getElementById('openCasesGrid');
            const gridClosed = document.getElementById('closedCasesGrid');
            if (!gridOpen || !gridClosed) return;
            
            gridOpen.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#667085;"><i class="fa-solid fa-spinner fa-spin"></i> Loading cases...</div>';
            gridClosed.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#667085;"><i class="fa-solid fa-spinner fa-spin"></i> Loading cases...</div>';
            
            try {
                const snap = await db.collection('cases').orderBy('lastUpdated', 'desc').get();
                const allCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                const openCases = allCases.filter(c => c.status !== 'Closed' && c.status !== 'Done');
                const closedCases = allCases.filter(c => c.status === 'Closed' || c.status === 'Done');
                
                function buildCard(c) {
                    const adminDocs = (c.documents || []).map((d, index) => {
                        const sigBadge = d.signed ? '<span style="background:#f0fdf4;color:#166534;font-size:0.65rem;padding:2px 6px;border-radius:50px;margin-left:auto;"><i class="fa-solid fa-check"></i> Signed</span>' : 
                                       d.requiresSignature ? '<span style="background:#fff7ed;color:#c2410c;font-size:0.65rem;padding:2px 6px;border-radius:50px;margin-left:auto;"><i class="fa-solid fa-clock"></i> Pending Sig</span>' :
                                       `<button class="btn-req-sig" data-case="${c.id}" data-idx="${index}" style="margin-left:auto;background:none;border:none;color:#4361ee;font-size:0.7rem;cursor:pointer;font-weight:600;"><i class="fa-solid fa-pen-nib"></i> Req. Sign</button>`;
                        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d0d5dd;border-radius:8px;background:#f9fafb;margin-bottom:6px;"><a href="${d.url}" target="_blank" style="text-decoration:none;font-size:0.8rem;color:#344054;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-file-pdf" style="color:#4361ee;"></i>${d.name}</a>${sigBadge}</div>`;
                    }).join('');
                    
                    const date = c.lastUpdated ? new Date(c.lastUpdated.toDate()).toLocaleDateString('en-RW') : 'N/A';
                    return `
                        <div style="background:#fff;border:1px solid var(--admin-border);border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                            <div style="font-weight:700;color:#0d1b35;margin-bottom:4px;font-size:1.05rem;">${c.clientName}</div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:0.75rem;color:#4361ee;font-weight:700;">${c.trackingCode}</code>
                                <span style="font-size:0.75rem;color:#667085;">Status: <strong style="color:#344054;">${c.status}</strong></span>
                            </div>
                            <div style="font-size:0.8rem;color:#667085;margin-bottom:16px;">Updated: ${date}</div>
                            <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
                                <div style="font-size:0.72rem;font-weight:700;color:#98a2b3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Saved Documents (${c.documents?.length || 0})</div>
                                ${adminDocs || '<div style="font-size:0.8rem;color:#98a2b3;font-style:italic;">No documents attached.</div>'}
                            </div>
                        </div>`;
                }

                if (openCases.length === 0) {
                    gridOpen.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#667085;">No open cases available.</div>';
                } else {
                    gridOpen.innerHTML = openCases.map(buildCard).join('');
                }
                
                if (closedCases.length === 0) {
                    gridClosed.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#667085;">No closed cases available.</div>';
                } else {
                    gridClosed.innerHTML = closedCases.map(buildCard).join('');
                }

                // Add Handlers for Req Signature
                document.querySelectorAll('.btn-req-sig').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-case');
                        const idx = parseInt(btn.getAttribute('data-idx'));
                        try {
                            const caseDoc = await db.collection('cases').doc(id).get();
                            const data = caseDoc.data();
                            const docs = data.documents || [];
                            if (docs[idx]) {
                                docs[idx].requiresSignature = true;
                                await db.collection('cases').doc(id).update({ documents: docs });
                                showToast("Signature Requested for " + docs[idx].name);
                                renderDocumentsTab();
                            }
                        } catch(e) { console.error(e); }
                    });
                });
                
            } catch(e) {
                console.error("Error loading documents tab:", e);
            }
        }

        // --- ASK A LAWYER INBOX ---
        async function renderLawyerInbox() {
            const container = document.getElementById('lawyerInboxList');
            if (!container) return;
            container.innerHTML = '<div style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
            try {
                const snap = await db.collection('messages').orderBy('createdAt', 'desc').get();
                const badge = document.getElementById('inboxBadge');
                const openCount = snap.docs.filter(d => d.data().status === 'open').length;
                if (badge) badge.textContent = openCount > 0 ? openCount : '';

                if (snap.empty) { container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--admin-text-muted)">No messages yet.</div>'; return; }

                container.innerHTML = '';
                snap.forEach(doc => {
                    const d = doc.data();
                    const statusBadge = d.adminReply
                        ? '<span style="background:rgba(18,183,106,0.1);color:#027a48;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:50px">Answered</span>'
                        : '<span style="background:rgba(255,167,38,0.12);color:#b76e00;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:50px">Awaiting Reply</span>';
                    const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : 'N/A';

                    container.innerHTML += `
                        <div style="border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:16px;background:${d.adminReply ? '#fff' : 'rgba(197,160,89,0.04)'}">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                                <div>
                                    <span style="font-weight:700">${d.clientName || 'Client'}</span>
                                    <span style="color:#667085;font-size:0.8rem;margin-left:10px">${d.email}</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:10px">
                                    ${statusBadge}
                                    <span style="color:#98a2b3;font-size:0.78rem">${date}</span>
                                </div>
                            </div>
                            <div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:12px;font-size:0.9rem;line-height:1.6">
                                <strong>Question:</strong> ${d.question}
                            </div>
                            ${d.adminReply ? `<div style="background:rgba(13,27,53,0.04);border-radius:8px;padding:12px;margin-bottom:12px;font-size:0.9rem;line-height:1.6;border-left:3px solid var(--admin-accent)"><strong>Your Reply:</strong> ${d.adminReply}</div>` : ''}
                            <div style="display:flex;gap:10px">
                                <textarea id="reply-${doc.id}" class="form-control" rows="2" placeholder="Type your reply..." style="flex:1;font-size:0.9rem">${d.adminReply || ''}</textarea>
                                <button class="btn-primary" onclick="sendLawyerReply('${doc.id}')" style="white-space:nowrap;align-self:flex-end"><i class="fa-solid fa-paper-plane"></i> ${d.adminReply ? 'Update' : 'Reply'}</button>
                            </div>
                        </div>`;
                });
            } catch(e) { container.innerHTML = '<div style="color:#ff6b6b;padding:20px">Error loading inbox.</div>'; }
        }

        window.sendLawyerReply = async function(docId) {
            const replyText = document.getElementById(`reply-${docId}`)?.value?.trim();
            if (!replyText) return showToast('Please type a reply first.', 'error');
            try {
                await db.collection('messages').doc(docId).update({
                    adminReply: replyText,
                    status: 'answered',
                    repliedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast('Reply sent to client!');
                renderLawyerInbox();
            } catch(e) { showToast('Error sending reply.', 'error'); }
        };

        // --- CLIENT ACCOUNTS ---
        async function renderClientAccounts() {
            const tbody = document.getElementById('clientAccountsBody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i> Loading accounts...</td></tr>';
            try {
                const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
                if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--admin-text-muted);padding:40px">No client accounts yet.</td></tr>'; return; }
                tbody.innerHTML = '';
                snap.forEach(doc => {
                    const d = doc.data();
                    const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : 'N/A';
                    tbody.innerHTML += `<tr>
                        <td style="font-weight:700">${d.name || '—'}</td>
                        <td>${d.email}</td>
                        <td>${d.phone || '—'}</td>
                        <td style="color:#667085;font-size:0.85rem">${date}</td>
                        <td style="text-align:right;display:flex;gap:6px;justify-content:flex-end">
                            <button class="btn-outline link-case-btn" data-uid="${doc.id}" data-name="${d.name || d.email}" style="font-size:0.8rem;padding:6px 12px">
                                <i class="fa-solid fa-link"></i> Link Case
                            </button>
                            <button class="btn-outline sig-req-btn" data-uid="${doc.id}" data-name="${d.name || d.email}" style="font-size:0.8rem;padding:6px 12px;color:#c5a059;border-color:#c5a059">
                                <i class="fa-solid fa-pen-nib"></i> Sign Request
                            </button>
                        </td>
                    </tr>`;
                });
                document.querySelectorAll('.link-case-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const uid = btn.getAttribute('data-uid');
                        const clientName = btn.getAttribute('data-name');
                        try {
                            const res = await window.showCustomModal({
                                title: `Link Case to ${clientName}`,
                                icon: 'fa-folder-open',
                                contentHTML: `<div class="form-group"><label for="linkCode">Tracking Code</label><input type="text" id="linkCode" class="form-control" placeholder="e.g. KL-AB12-1234" style="font-family:monospace;font-weight:700;letter-spacing:1px"></div>`,
                                confirmText: 'Link Case'
                            });
                            const code = (res?.linkCode || '').trim().toUpperCase();
                            if (!code) return;
                            const q = await db.collection('cases').where('trackingCode', '==', code).limit(1).get();
                            if (q.empty) return showToast('Tracking code not found.', 'error');
                            await q.docs[0].ref.update({ uid });
                            showToast(`Case ${code} linked to ${clientName}!`);
                        } catch(e) {}
                    });
                });

                // Signature Request buttons
                document.querySelectorAll('.sig-req-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const uid = btn.getAttribute('data-uid');
                        const clientName = btn.getAttribute('data-name');
                        sendSignatureRequest(uid, clientName);
                    });
                });
            } catch(e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#ff6b6b;padding:20px">Error loading accounts.</td></tr>'; }
        }

        async function sendSignatureRequest(clientUid, clientName) {
            try {
                const res = await window.showCustomModal({
                    title: `Request Signature from ${clientName}`,
                    icon: 'fa-pen-nib',
                    contentHTML: `
                        <div class="form-group" style="margin-bottom:12px">
                            <label for="sigDocNameInput" style="font-weight:600;font-size:0.85rem">Document Name *</label>
                            <input type="text" id="sigDocNameInput" class="form-control" placeholder="e.g. Retainer Agreement" style="margin-top:6px">
                        </div>
                        <div class="form-group">
                            <label for="sigDocUrlInput" style="font-weight:600;font-size:0.85rem">Document URL (optional)</label>
                            <input type="url" id="sigDocUrlInput" class="form-control" placeholder="https://..." style="margin-top:6px">
                        </div>`,
                    confirmText: 'Send Request'
                });
                const docName = (res?.sigDocNameInput || '').trim();
                const docUrl  = (res?.sigDocUrlInput  || '').trim();
                if (!docName) return showToast('Document name is required.', 'error');
                await db.collection('signature_requests').add({
                    clientUid, clientName, documentName: docName,
                    documentUrl: docUrl || null,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: firebase.auth().currentUser?.email || 'admin'
                });
                showToast(`Signature request sent to ${clientName}!`);
            } catch(e) { console.error('Sig request error:', e); }
        }

        // ── Marketing Tab ──────────────────────────────────────────────────────
        async function loadMarketingTab() {
            try {
                const [subSnap, clientSnap, campSnap] = await Promise.all([
                    db.collection('subscribers').get(),
                    db.collection('users').get(),
                    db.collection('campaigns').orderBy('sentAt','desc').get()
                ]);

                const subEl = document.getElementById('mktSubCount');
                const cliEl = document.getElementById('mktClientCount');
                const campEl = document.getElementById('mktCampaignCount');
                if (subEl) subEl.textContent = subSnap.size;
                if (cliEl) cliEl.textContent = clientSnap.size;
                if (campEl) campEl.textContent = campSnap.size;

                // Subscribers list
                const subBody = document.getElementById('subscribersTableBody');
                if (subBody) {
                    if (subSnap.empty) {
                        subBody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--admin-text-muted);padding:24px;">No subscribers yet.</td></tr>';
                    } else {
                        subBody.innerHTML = '';
                        subSnap.forEach(doc => {
                            const d = doc.data();
                            subBody.innerHTML += `<tr>
                                <td style="font-weight:500">${d.email}</td>
                                <td style="color:#667085;font-size:0.85rem">${d.subscribedAt ? new Date(d.subscribedAt.toDate()).toLocaleDateString('en-RW') : 'N/A'}</td>
                            </tr>`;
                        });
                    }
                }

                // Templates list
                const tmplBody = document.getElementById('templatesTableBody');
                if (tmplBody) {
                    const tmplSnap = await db.collection('template_requests').orderBy('createdAt','desc').limit(20).get();
                    if (tmplSnap.empty) {
                        tmplBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--admin-text-muted);padding:24px;">No template requests yet.</td></tr>';
                    } else {
                        tmplBody.innerHTML = '';
                        tmplSnap.forEach(doc => {
                            const d = doc.data();
                            tmplBody.innerHTML += `<tr>
                                <td><div style="font-weight:600">${d.name||'—'}</div><div style="font-size:0.78rem;color:#667085">${d.email||''}</div></td>
                                <td style="color:#344054;font-size:0.88rem">${d.template||'—'}</td>
                                <td style="color:#667085;font-size:0.82rem">${d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                            </tr>`;
                        });
                    }
                }

                loadCampaignHistory();
            } catch(e) { console.error('Marketing load error:', e); }
        }

        window.loadCampaignHistory = async function() {
            const body = document.getElementById('campaignHistoryBody');
            if (!body) return;
            body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
            try {
                const snap = await db.collection('campaigns').orderBy('sentAt','desc').limit(20).get();
                if (snap.empty) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--admin-text-muted);padding:30px">No campaigns sent yet.</td></tr>'; return; }
                body.innerHTML = '';
                snap.forEach(doc => {
                    const d = doc.data();
                    const audienceLabel = {subscribers:'Subscribers',clients:'Clients',all:'Everyone'}[d.audience] || d.audience;
                    const date = d.sentAt ? new Date(d.sentAt.toDate()).toLocaleString('en-RW',{dateStyle:'medium',timeStyle:'short'}) : 'N/A';
                    const statusColor = d.status==='sent' ? '#12b76a' : d.status==='failed' ? '#d92d20' : '#f59e0b';
                    body.innerHTML += `<tr>
                        <td style="font-weight:600;color:#0d1b35;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.subject}</td>
                        <td><span style="background:#f0f2ff;color:#4361ee;padding:2px 8px;border-radius:50px;font-size:0.75rem;font-weight:600">${audienceLabel}</span></td>
                        <td style="font-weight:700;color:#0d1b35">${d.recipientCount || 0}</td>
                        <td style="color:#667085;font-size:0.85rem">${date}</td>
                        <td><span style="background:${statusColor}18;color:${statusColor};padding:2px 10px;border-radius:50px;font-size:0.75rem;font-weight:700;text-transform:capitalize">${d.status||'sent'}</span></td>
                    </tr>`;
                });
            } catch(e) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#d92d20;padding:20px">Error loading history.</td></tr>'; }
        };

        window.sendCampaign = async function() {
            const subject  = document.getElementById('campSubject')?.value?.trim();
            const bodyHTML = document.getElementById('campBody')?.innerHTML?.trim();
            const audience = document.getElementById('campAudience')?.value;
            const statusEl = document.getElementById('campStatus');
            const btn      = document.getElementById('sendCampBtn');

            if (!subject) return showToast('Please enter an email subject.', 'error');
            if (!bodyHTML || bodyHTML === '<br>') return showToast('Please write the email body.', 'error');

            // Collect recipient emails from Firestore
            statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Collecting recipients...';
            btn.disabled = true;

            try {
                let emails = new Set();

                if (audience === 'subscribers' || audience === 'all') {
                    const subSnap = await db.collection('subscribers').get();
                    subSnap.forEach(d => { if (d.data().email) emails.add(d.data().email.trim().toLowerCase()); });
                }
                if (audience === 'clients' || audience === 'all') {
                    const cliSnap = await db.collection('users').get();
                    cliSnap.forEach(d => { if (d.data().email) emails.add(d.data().email.trim().toLowerCase()); });
                }

                const recipientList = [...emails];
                if (recipientList.length === 0) {
                    showToast('No recipients found for the selected audience.', 'error');
                    statusEl.textContent = '';
                    btn.disabled = false;
                    return;
                }

                statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending to ${recipientList.length} recipients...`;

                // Call Cloud Function
                const functions = firebase.app().functions();
                const sendFn = functions.httpsCallable('sendEmailCampaign');
                const result = await sendFn({ subject, bodyHTML, audience, recipients: recipientList });

                // Record in Firestore
                await db.collection('campaigns').add({
                    subject, audience, bodyHTML,
                    recipientCount: recipientList.length,
                    status: result.data?.success ? 'sent' : 'partial',
                    sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                    sentBy: firebase.auth().currentUser?.email || 'admin'
                });

                showToast(`✅ Campaign sent to ${recipientList.length} recipients!`);
                statusEl.textContent = '';
                document.getElementById('campSubject').value = '';
                document.getElementById('campBody').innerHTML = '';
                const countEl = document.getElementById('mktCampaignCount');
                if (countEl) countEl.textContent = Number(countEl.textContent||0) + 1;
                loadCampaignHistory();
            } catch(e) {
                console.error('Campaign error:', e);
                showToast('Error sending campaign. Check console for details.', 'error');
                statusEl.textContent = '';
            }
            btn.disabled = false;
        };

        window.previewCampaign = function() {
            const subject  = document.getElementById('campSubject')?.value || '(No subject)';
            const bodyHTML = document.getElementById('campBody')?.innerHTML || '';
            const overlay  = document.getElementById('campPreviewOverlay');
            const preview  = document.getElementById('campPreviewBody');
            if (!overlay || !preview) return;
            preview.innerHTML = `
                <div style="background:linear-gradient(135deg,#0d1b35,#1a3060);padding:24px 28px;border-radius:10px;margin-bottom:16px;">
                    <div style="font-size:18px;font-weight:800;color:#c5a059;letter-spacing:1px;">⚖ KALTO LAW</div>
                    <div style="font-size:11px;color:#8fa3cc;margin-top:3px;letter-spacing:2px;">LEGAL EXCELLENCE</div>
                </div>
                <div style="background:#c5a059;padding:10px 16px;border-radius:6px;margin-bottom:20px;">
                    <strong style="color:#fff;font-size:0.85rem">${subject}</strong>
                </div>
                <div style="font-family:'Inter',sans-serif;font-size:0.9rem;line-height:1.7;color:#344054">${bodyHTML}</div>
                <hr style="border:none;border-top:1px solid #e4e7ec;margin:24px 0">
                <div style="text-align:center;font-size:0.75rem;color:#98a2b3">
                    KALTO LAW AND SERVICES LTD · Kigali, Rwanda · kalto-law.web.app<br>
                    <a href="#" style="color:#c5a059">Unsubscribe</a>
                </div>`;
            overlay.style.display = 'flex';
        };

        window.fmtCamp = function(cmd) {
            document.getElementById('campBody').focus();
            document.execCommand(cmd, false, null);
        };

        window.insertCampLink = function() {
            const url = prompt('Enter URL:');
            if (url) { document.getElementById('campBody').focus(); document.execCommand('createLink', false, url); }
        };

        window.exportSubscribers = async function() {
            try {
                const snap = await db.collection('subscribers').get();
                if (snap.empty) return showToast('No subscribers to export.', 'error');
                let csv = 'Email,Date Subscribed\n';
                snap.forEach(doc => {
                    const d = doc.data();
                    const date = d.subscribedAt ? new Date(d.subscribedAt.toDate()).toLocaleDateString() : '';
                    csv += `"${d.email}","${date}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `kalto-subscribers-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                showToast('Subscribers exported as CSV!');
            } catch(e) { showToast('Export failed.', 'error'); }
        };

        // Wire marketing tab to switchTab
        const _origSwitchTab = window.switchTab;
        window.switchTab = function(tabName) {
            _origSwitchTab(tabName);
            if (tabName === 'marketing') loadMarketingTab();
        };

        // Also update the switchTab titleMap entry
        if (document.querySelector('[data-tab="marketing"]')) {
        // Wait! Add marketing listener only if the tab exists in the sidebar
        const marketingTabLink = document.querySelector('[data-tab="marketing"]');
        if (marketingTabLink) {
            marketingTabLink.addEventListener('click', () => switchTab('marketing'));
        }
        }

        // ── #17 Admin Push Notifications ──────────────────────────────────────
        initAdminPushNotifications();

    }
});

// ── Push Notifications (browser Notification API + Firestore onSnapshot) ────
function initAdminPushNotifications() {
    if (!('Notification' in window)) return;

    // Request permission silently on first login
    if (Notification.permission === 'default') {
        setTimeout(() => {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') showAdminPush('🔔 Notifications On', 'You will now receive real-time alerts for messages and bookings.', null);
            });
        }, 3000);
    }

    if (!window.fbDb) return;
    const db = window.fbDb;
    let _lastMsgTime = Date.now();
    let _lastBookTime = Date.now();

    // Watch for new messages
    db.collection('messages').orderBy('createdAt', 'desc').limit(1)
        .onSnapshot(snap => {
            if (snap.empty) return;
            const d = snap.docs[0].data();
            const ts = d.createdAt ? d.createdAt.toMillis() : 0;
            if (ts > _lastMsgTime) {
                _lastMsgTime = ts;
                showAdminPush(
                    `💬 New Message from ${d.clientName || 'Client'}`,
                    d.question ? d.question.substring(0, 80) + '…' : 'A client sent a new message.',
                    '#lawyerinbox'
                );
                // Update inbox badge
                const badge = document.getElementById('inboxBadge');
                if (badge) badge.textContent = Number(badge.textContent || 0) + 1;
            }
        });

    // Watch for new bookings
    db.collection('appointments').orderBy('createdAt', 'desc').limit(1)
        .onSnapshot(snap => {
            if (snap.empty) return;
            const d = snap.docs[0].data();
            const ts = d.createdAt ? d.createdAt.toMillis() : 0;
            if (ts > _lastBookTime) {
                _lastBookTime = ts;
                showAdminPush(
                    `📅 New Booking — ${d.service || 'Consultation'}`,
                    `${d.name || 'A client'} booked for ${d.date || ''} at ${d.time || ''}`,
                    '#appointments'
                );
            }
        });
}

function showAdminPush(title, body, tabHash) {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, {
        body,
        icon: '/images/CHOOSE.jpg',
        badge: '/images/CHOOSE.jpg',
        tag: 'kalto-admin',
        requireInteraction: false,
    });
    n.onclick = () => {
        window.focus();
        if (tabHash) {
            const tabName = tabHash.replace('#', '');
            if (window.switchTab) switchTab(tabName);
        }
        n.close();
    };
    setTimeout(() => n.close(), 8000);
}


// --- EXPORT TO CSV LOGIC ---
window.exportAppointmentsCSV = async function() {
    try {
        if(typeof showToast === 'function') showToast("Preparing Appointments Export...", "info");
        const snapshot = await window.fbDb.collection("appointments").orderBy("createdAt", "desc").get();
        if (snapshot.empty) {
            alert("No appointments to export.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Name,Email,Date,Time,Service,Tracking Number,Status,Created At\n";
        snapshot.forEach(doc => {
            const data = doc.data();
            const created = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
            const row = [
                '"' + (data.name || '') + '"',
                '"' + (data.email || '') + '"',
                '"' + (data.date || '') + '"',
                '"' + (data.time || '') + '"',
                '"' + (data.service || '') + '"',
                '"' + (data.docNumber || '') + '"',
                '"' + (data.status || '') + '"',
                '"' + created + '"'
            ].join(",");
            csvContent += row + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "kalto_appointments.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        if(typeof showToast === 'function') showToast("Export successful!", "success");
    } catch (e) {
        console.error("Export Error:", e);
        alert("Failed to export appointments.");
    }
};

window.exportMessagesCSV = async function() {
    try {
        if(typeof showToast === 'function') showToast("Preparing Messages Export...", "info");
        const snapshot = await window.fbDb.collection("enquiries").orderBy("createdAt", "desc").get();
        if (snapshot.empty) {
            alert("No messages to export.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone,Service,Message,Status,Created At\n";
        snapshot.forEach(doc => {
            const data = doc.data();
            const created = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
            // Clean message for CSV
            let msg = data.message ? data.message.replace(/\n/g, " ").replace(/"/g, '""') : '';
            const row = [
                '"' + (data.name || '') + '"',
                '"' + (data.email || '') + '"',
                '"' + (data.phone || '') + '"',
                '"' + (data.service || '') + '"',
                '"' + msg + '"',
                '"' + (data.status || '') + '"',
                '"' + created + '"'
            ].join(",");
            csvContent += row + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "kalto_messages.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        if(typeof showToast === 'function') showToast("Export successful!", "success");
    } catch (e) {
        console.error("Export Error:", e);
        alert("Failed to export messages.");
    }
};





        // ── INIT DASHBOARD CHARTS ────────────────────────────────────────────
        window.initDashboardCharts = function(invoicesSnap, casesSnap) {
            const revCtx = document.getElementById('revenueChart');
            const caseCtx = document.getElementById('casesChart');
            
            if (revCtx && !window.revenueChartInstance) {
                // Aggregate revenue by month
                const monthlyRev = {};
                invoicesSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'paid' && data.paidAt) {
                        const date = data.paidAt.toDate();
                        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                        monthlyRev[month] = (monthlyRev[month] || 0) + Number(data.amount);
                    }
                });
                const labels = Object.keys(monthlyRev).sort((a,b) => new Date(a) - new Date(b));
                const dataVals = labels.map(l => monthlyRev[l]);
                
                window.revenueChartInstance = new Chart(revCtx, {
                    type: 'bar',
                    data: {
                        labels: labels.length ? labels : ['No Data'],
                        datasets: [{
                            label: 'Revenue (RWF)',
                            data: dataVals.length ? dataVals : [0],
                            backgroundColor: '#c5a059',
                            borderRadius: 6
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            if (caseCtx && !window.casesChartInstance) {
                const statusCounts = { 'Initiated': 0, 'In Progress': 0, 'Pending Review': 0, 'Closed': 0 };
                casesSnap.forEach(doc => {
                    const status = doc.data().status;
                    if (statusCounts[status] !== undefined) statusCounts[status]++;
                });
                
                window.casesChartInstance = new Chart(caseCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(statusCounts),
                        datasets: [{
                            data: Object.values(statusCounts),
                            backgroundColor: ['#6366f1', '#f59e0b', '#3b82f6', '#10b981'],
                            borderWidth: 0
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        };

        // ── CONFLICT CHECK LOGIC ─────────────────────────────────────────────
        const conflictSearchInput = document.getElementById('conflictSearchInput');
        const conflictSearchBtn = document.getElementById('conflictSearchBtn');
        const conflictCheckModal = document.getElementById('conflictCheckModal');
        const closeConflictModal = document.getElementById('closeConflictModal');
        const conflictResultsContainer = document.getElementById('conflictResultsContainer');
        const conflictSearchTermDisplay = document.getElementById('conflictSearchTermDisplay');

        if (conflictSearchBtn) {
            conflictSearchBtn.addEventListener('click', runConflictCheck);
            conflictSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') runConflictCheck();
            });
        }
        if (closeConflictModal) {
            closeConflictModal.addEventListener('click', () => {
                conflictCheckModal.style.display = 'none';
            });
        }

        async function runConflictCheck() {
            const term = conflictSearchInput.value.trim().toLowerCase();
            if (!term) return showToast('Please enter a name or email to search.', 'error');
            
            conflictSearchTermDisplay.innerHTML = `Searching for: <strong>${term}</strong>`;
            conflictResultsContainer.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Running deep search...</div>';
            conflictCheckModal.style.display = 'flex';
            
            try {
                // Fetch all and filter client-side (for accurate deep substring search)
                const [casesSnap, enqSnap, apptsSnap] = await Promise.all([
                    db.collection('cases').get(),
                    db.collection('enquiries').get(),
                    db.collection('appointments').get()
                ]);

                const results = [];

                casesSnap.forEach(d => {
                    const data = d.data();
                    if ((data.clientName || '').toLowerCase().includes(term) || (data.email || '').toLowerCase().includes(term)) {
                        results.push({ type: 'Case', name: data.clientName, detail: `Status: ${data.status} (Code: ${data.trackingCode})` });
                    }
                });

                enqSnap.forEach(d => {
                    const data = d.data();
                    if ((data.name || '').toLowerCase().includes(term) || (data.email || '').toLowerCase().includes(term)) {
                        results.push({ type: 'Inquiry', name: data.name, detail: `Service: ${data.service || 'General'} (${data.email||''})` });
                    }
                });

                apptsSnap.forEach(d => {
                    const data = d.data();
                    if ((data.name || '').toLowerCase().includes(term) || (data.email || '').toLowerCase().includes(term)) {
                        results.push({ type: 'Appointment', name: data.name, detail: `Date: ${data.date} ${data.time}` });
                    }
                });

                if (results.length === 0) {
                    conflictResultsContainer.innerHTML = '<div style="padding:20px;background:#f0fdf4;color:#15803d;border-radius:8px;font-weight:600;"><i class="fa-solid fa-check-circle"></i> No conflicts found. Safe to proceed.</div>';
                } else {
                    let html = '<div style="padding:16px;background:#fef2f2;color:#b91c1c;border-radius:8px;font-weight:600;margin-bottom:16px;"><i class="fa-solid fa-triangle-exclamation"></i> Warning: Prior interactions found.</div>';
                    results.forEach(r => {
                        let color = r.type === 'Case' ? '#c5a059' : r.type === 'Inquiry' ? '#3b82f6' : '#10b981';
                        html += `
                            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                    <strong style="color:#0f172a;">${r.name}</strong>
                                    <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:50px;font-size:0.75rem;font-weight:700;">${r.type}</span>
                                </div>
                                <div style="font-size:0.85rem;color:#64748b;">${r.detail}</div>
                            </div>
                        `;
                    });
                    conflictResultsContainer.innerHTML = html;
                }

            } catch(e) {
                console.error("Conflict check error:", e);
                conflictResultsContainer.innerHTML = '<div style="color:#b91c1c;text-align:center;">Error running conflict check.</div>';
            }
        }





        // ── AUTOMATION SUITE: EMAILJS ─────────────────────────────────────────
        // Initialize EmailJS (Placeholder Key)
        if (window.emailjs) {
            emailjs.init("YOUR_PUBLIC_KEY");
        }

        window.sendClientEmail = async function(toEmail, toName, subject, message) {
            if (!window.emailjs) {
                console.warn("EmailJS not loaded. Mock sending email to " + toEmail);
                return;
            }
            try {
                // Requires an EmailJS service ID and template ID
                const serviceID = 'YOUR_SERVICE_ID';
                const templateID = 'YOUR_TEMPLATE_ID';
                
                await emailjs.send(serviceID, templateID, {
                    to_email: toEmail,
                    to_name: toName,
                    subject: subject,
                    message: message,
                    firm_name: "KALTO LAW AND SERVICES LTD"
                });
                console.log("Automated email sent to", toEmail);
            } catch (err) {
                console.error("Failed to send automated email via EmailJS", err);
            }
        };

        // ── AUTOMATION SUITE: MASTER BACKUP ───────────────────────────────────
        window.generateMasterBackup = async function() {
            showToast("Gathering data for Master Backup...");
            try {
                const zip = new JSZip();
                
                // Fetch Data
                const [casesSnap, clientsSnap, invoicesSnap] = await Promise.all([
                    db.collection('cases').get(),
                    db.collection('users').get(),
                    db.collection('invoices').get()
                ]);

                // Helper to create CSV
                const toCSV = (snap, headers, rowMap) => {
                    const rows = [headers.join(',')];
                    snap.forEach(doc => {
                        const d = doc.data();
                        rows.push(rowMap(d).map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(','));
                    });
                    return rows.join('\n');
                };

                // Cases CSV
                const casesCSV = toCSV(casesSnap, ['Tracking Code', 'Client Name', 'Status', 'Date'], d => [
                    d.trackingCode, d.clientName, d.status, d.createdAt ? d.createdAt.toDate().toISOString() : ''
                ]);
                zip.file("kalto_cases.csv", casesCSV);

                // Clients CSV
                const clientsCSV = toCSV(clientsSnap, ['Name', 'Email', 'Role', 'Joined'], d => [
                    d.name, d.email, d.role, d.createdAt ? d.createdAt.toDate().toISOString() : ''
                ]);
                zip.file("kalto_clients.csv", clientsCSV);

                // Invoices CSV
                const invoicesCSV = toCSV(invoicesSnap, ['Invoice ID', 'Client', 'Amount', 'Status', 'Due Date'], d => [
                    d.id, d.clientName, d.amount, d.status, d.dueDate
                ]);
                zip.file("kalto_invoices.csv", invoicesCSV);

                // Generate Zip
                const content = await zip.generateAsync({ type: "blob" });
                const url = window.URL.createObjectURL(content);
                const a = document.createElement("a");
                a.href = url;
                a.download = "Kalto_Master_Backup_" + new Date().toISOString().split('T')[0] + ".zip";
                a.click();
                window.URL.revokeObjectURL(url);
                showToast("Master Backup generated successfully!", "success");

            } catch (e) {
                console.error("Backup Error:", e);
                showToast("Failed to generate backup.", "error");
            }
        };



        // ── AUTOMATION SUITE: KANBAN TASK MANAGER ─────────────────────────────
        const kanbanTodo = document.getElementById('kanbanTodo');
        const kanbanProgress = document.getElementById('kanbanProgress');
        const kanbanDone = document.getElementById('kanbanDone');
        const newTaskBtn = document.getElementById('newTaskBtn');

        async function renderTasksList() {
            if (!kanbanTodo || !kanbanProgress || !kanbanDone) return;
            
            kanbanTodo.innerHTML = '';
            kanbanProgress.innerHTML = '';
            kanbanDone.innerHTML = '';

            try {
                const snap = await db.collection('tasks').get();
                snap.forEach(doc => {
                    const task = doc.data();
                    const status = task.status || 'todo';
                    const el = document.createElement('div');
                    el.className = 'task-card';
                    el.setAttribute('data-id', doc.id);
                    el.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;cursor:grab;box-shadow:0 1px 2px rgba(0,0,0,0.05);';
                    
                    const codeHtml = task.caseCode ? `<div style="margin-top:8px;"><code style="background:#f1f5f9;color:#4361ee;padding:2px 6px;border-radius:4px;font-size:0.7rem;">${task.caseCode}</code></div>` : '';
                    const dateHtml = task.deadline ? `<div style="margin-top:8px;font-size:0.75rem;color:#dc2626;"><i class="fa-regular fa-clock"></i> Due: ${task.deadline}</div>` : '';

                    el.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <div style="font-weight:600;font-size:0.9rem;color:#1e293b;">${task.title}</div>
                            <button class="btn-delete-task" style="background:none;border:none;color:#d92d20;cursor:pointer;font-size:0.8rem;padding:0;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                        <div style="font-size:0.8rem;color:#64748b;margin-top:4px;">${task.description||''}</div>
                        ${codeHtml}
                        ${dateHtml}
                    `;

                    el.querySelector('.btn-delete-task').onclick = async (e) => {
                        e.stopPropagation();
                        try {
                            await showConfirmModal("Delete Task", "Are you sure you want to permanently delete this task?");
                            await db.collection("tasks").doc(doc.id).delete();
                            showToast("Task deleted.");
                            renderTasksList();
                        } catch(err) { /* cancelled */ }
                    };

                    if (status === 'todo') kanbanTodo.appendChild(el);
                    else if (status === 'progress') kanbanProgress.appendChild(el);
                    else kanbanDone.appendChild(el);
                });

                // Init SortableJS
                if (window.Sortable) {
                    const opts = {
                        group: 'kanban',
                        animation: 150,
                        onEnd: async function (evt) {
                            const itemEl = evt.item;
                            const taskId = itemEl.getAttribute('data-id');
                            const newStatus = evt.to.getAttribute('data-status');
                            if (taskId && newStatus) {
                                await db.collection('tasks').doc(taskId).update({ status: newStatus });
                                showToast("Task updated.");
                            }
                        }
                    };
                    new Sortable(kanbanTodo, opts);
                    new Sortable(kanbanProgress, opts);
                    new Sortable(kanbanDone, opts);
                }

            } catch(e) {
                console.error("Task render error", e);
            }
        }

        if (newTaskBtn) {
            newTaskBtn.addEventListener('click', async () => {
                const res = await window.showCustomModal({
                    title: 'Add New Firm Task',
                    icon: 'fa-list-check',
                    contentHTML: `
                        <div class="form-group mb-md">
                            <label>Task Title *</label>
                            <input type="text" id="taskTitle" class="form-control" placeholder="e.g. Draft corporate bylaws">
                        </div>
                        <div class="form-group mb-md">
                            <label>Description</label>
                            <textarea id="taskDesc" class="form-control" rows="2"></textarea>
                        </div>
                        <div class="grid grid-2" style="gap:16px;">
                            <div class="form-group">
                                <label>Link to Case (Tracking Code)</label>
                                <input type="text" id="taskCode" class="form-control" placeholder="KL-XXXX-XXXX">
                            </div>
                            <div class="form-group">
                                <label>Deadline</label>
                                <input type="date" id="taskDate" class="form-control">
                            </div>
                        </div>
                    `,
                    confirmText: 'Create Task'
                });

                if (res && res.taskTitle) {
                    await db.collection('tasks').add({
                        title: res.taskTitle,
                        description: res.taskDesc,
                        caseCode: res.taskCode,
                        deadline: res.taskDate,
                        status: 'todo',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showToast("Task created!");
                    renderTasksList();
                }
            });
        }






        // ── BILLING MODULE ────────────────────────────────────────────────────
        window.switchBillingSubtab = function(sub) {
            var invoicesView = document.getElementById('billingInvoicesView');
            var receiptsView = document.getElementById('billingReceiptsView');
            var invoicesBtn  = document.getElementById('billingSubtabInvoices');
            var receiptsBtn  = document.getElementById('billingSubtabReceipts');
            if (!invoicesView) return;
            if (sub === 'invoices') {
                invoicesView.style.display = 'block';
                receiptsView.style.display = 'none';
                invoicesBtn.style.borderBottomColor = 'var(--admin-accent)';
                invoicesBtn.style.color = 'var(--admin-sidebar-bg)';
                receiptsBtn.style.borderBottomColor = 'transparent';
                receiptsBtn.style.color = 'var(--admin-text-muted)';
            } else {
                invoicesView.style.display = 'none';
                receiptsView.style.display = 'block';
                receiptsBtn.style.borderBottomColor = 'var(--admin-accent)';
                receiptsBtn.style.color = 'var(--admin-sidebar-bg)';
                invoicesBtn.style.borderBottomColor = 'transparent';
                invoicesBtn.style.color = 'var(--admin-text-muted)';
            }
        };

        async function renderBillingTab() {
            var invoicesBody = document.getElementById('invoicesTableBody');
            var receiptsBody = document.getElementById('receiptsTableBody');
            if (!invoicesBody || !receiptsBody) return;
            invoicesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading invoices...</td></tr>';
            receiptsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading receipts...</td></tr>';
            try {
                var snap = await db.collection('invoices').orderBy('createdAt', 'desc').get();
                var all  = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
                if (all.length === 0) {
                    invoicesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--admin-text-muted);padding:40px;">No invoices yet. Click Create Invoice to add one.</td></tr>';
                } else {
                    invoicesBody.innerHTML = '';
                    all.forEach(function(inv) {
                        var isPaid = inv.status === 'paid';
                        var badge  = isPaid
                            ? '<span style="background:rgba(18,183,106,0.1);color:#027a48;padding:3px 10px;border-radius:50px;font-size:0.75rem;font-weight:700;"><i class=\"fa-solid fa-check\"></i> Paid</span>'
                            : '<span style="background:rgba(247,144,9,0.1);color:#b45309;padding:3px 10px;border-radius:50px;font-size:0.75rem;font-weight:700;"><i class=\"fa-solid fa-clock\"></i> Pending</span>';
                        var date = inv.createdAt ? new Date(inv.createdAt.toDate()).toLocaleDateString('en-RW') : 'N/A';
                        var row  = document.createElement('tr');
                        row.innerHTML =
                            '<td><code style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:0.8rem;font-weight:700;color:#4361ee;">' + (inv.invoiceId || inv.id.slice(0,8).toUpperCase()) + '</code><div style="font-size:0.72rem;color:#98a2b3;margin-top:2px;">' + date + '</div></td>' +
                            '<td><div style="font-weight:600;color:#0d1b35;">' + (inv.clientName || 'N/A') + '</div><div style="font-size:0.78rem;color:#667085;">' + (inv.caseCode || '') + '</div></td>' +
                            '<td style="font-weight:700;color:#0d1b35;">RWF ' + Number(inv.amount||0).toLocaleString() + '</td>' +
                            '<td>' + badge + '</td>' +
                            '<td style="text-align:right;white-space:nowrap;">' +
                            (!isPaid ? '<button class="btn-primary mark-paid-btn" data-id="' + inv.id + '" style="padding:5px 12px;font-size:0.78rem;margin-right:6px;"><i class="fa-solid fa-check"></i> Mark Paid</button>' : '') +
                            '<button class="btn-outline del-invoice-btn" data-id="' + inv.id + '" style="color:#d92d20;border-color:#fda29b;padding:5px 10px;"><i class="fa-solid fa-trash"></i></button>' +
                            '</td>';
                        invoicesBody.appendChild(row);
                    });
                    invoicesBody.querySelectorAll('.mark-paid-btn').forEach(function(btn) {
                        btn.addEventListener('click', async function() {
                            try {
                                await db.collection('invoices').doc(btn.getAttribute('data-id')).update({ status: 'paid', paidAt: firebase.firestore.FieldValue.serverTimestamp() });
                                window.showToast('Invoice marked as paid');
                                renderBillingTab();
                            } catch(e) { console.error(e); }
                        });
                    });
                    invoicesBody.querySelectorAll('.del-invoice-btn').forEach(function(btn) {
                        btn.addEventListener('click', async function() {
                            try {
                                await window.showConfirmModal('Delete Invoice', 'This permanently removes the invoice record.');
                                await db.collection('invoices').doc(btn.getAttribute('data-id')).delete();
                                window.showToast('Invoice deleted.');
                                renderBillingTab();
                            } catch(e) { /* cancelled */ }
                        });
                    });
                }
                var paid = all.filter(function(inv) { return inv.status === 'paid'; });
                if (paid.length === 0) {
                    receiptsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--admin-text-muted);padding:40px;">No receipts yet. Mark an invoice as paid to generate a receipt.</td></tr>';
                } else {
                    receiptsBody.innerHTML = '';
                    paid.forEach(function(inv, i) {
                        var paidDate = inv.paidAt ? new Date(inv.paidAt.toDate()).toLocaleDateString('en-RW') : 'N/A';
                        var row = document.createElement('tr');
                        row.innerHTML =
                            '<td><code style="background:#f0fdf4;padding:3px 8px;border-radius:4px;font-size:0.8rem;font-weight:700;color:#027a48;">RCT-' + String(i+1).padStart(4,'0') + '</code></td>' +
                            '<td style="font-weight:600;color:#0d1b35;">' + (inv.clientName || 'N/A') + '</td>' +
                            '<td style="font-weight:700;color:#0d1b35;">RWF ' + Number(inv.amount||0).toLocaleString() + '</td>' +
                            '<td style="color:#667085;">' + paidDate + '</td>' +
                            '<td style="text-align:right;"><button class="btn-outline pdf-btn" data-id="' + inv.id + '" style="padding:5px 12px;font-size:0.78rem;"><i class="fa-solid fa-download"></i> PDF</button></td>';
                        receiptsBody.appendChild(row);
                    });
                    receiptsBody.querySelectorAll('.pdf-btn').forEach(function(btn) {
                        btn.addEventListener('click', function() {
                            var inv = paid.find(function(p) { return p.id === btn.getAttribute('data-id'); });
                            if (inv) generateReceiptPDF(inv);
                        });
                    });
                }
            } catch(e) {
                console.error('Billing error:', e);
                invoicesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#d92d20;padding:40px;">Error loading billing: ' + e.message + '</td></tr>';
            }
        }

        function generateReceiptPDF(inv) {
            var paidDate = inv.paidAt ? new Date(inv.paidAt.toDate()).toLocaleDateString('en-RW') : 'N/A';
            var html = '<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#0d1b35;max-width:600px;margin:auto}.logo{font-size:1.5rem;font-weight:900}h1{color:#c5a059}hr{border:1px solid #e2e8f0;margin:20px 0}table{width:100%;border-collapse:collapse}td{padding:10px 0}.lbl{color:#667085}.val{font-weight:700;text-align:right}.tot td{font-size:1.1rem;font-weight:900;border-top:2px solid #0d1b35;padding-top:12px}.stamp{display:inline-block;border:3px solid #027a48;color:#027a48;padding:8px 24px;border-radius:8px;font-weight:900;transform:rotate(-5deg);margin-top:16px;letter-spacing:2px}.foot{margin-top:40px;font-size:0.75rem;color:#98a2b3;border-top:1px solid #f1f5f9;padding-top:12px}</style></head><body>' +
                '<div class="logo">KALTO LAW</div>' +
                '<p style="color:#667085;font-size:0.85rem;margin-top:4px">Professional Legal Services &middot; Kigali, Rwanda</p>' +
                '<h1>OFFICIAL RECEIPT</h1>' +
                '<p style="color:#667085;font-size:0.85rem">Invoice: <strong>' + (inv.invoiceId||inv.id.slice(0,8).toUpperCase()) + '</strong> &nbsp;|&nbsp; Date: <strong>' + paidDate + '</strong></p>' +
                '<hr><table>' +
                '<tr><td class="lbl">Client Name</td><td class="val">' + (inv.clientName||'N/A') + '</td></tr>' +
                (inv.caseCode ? '<tr><td class="lbl">Case Code</td><td class="val">' + inv.caseCode + '</td></tr>' : '') +
                (inv.service  ? '<tr><td class="lbl">Service</td><td class="val">' + inv.service + '</td></tr>' : '') +
                '<tr><td class="lbl">Date Paid</td><td class="val">' + paidDate + '</td></tr>' +
                '<tr class="tot"><td>AMOUNT RECEIVED</td><td class="val">RWF ' + Number(inv.amount||0).toLocaleString() + '</td></tr>' +
                '</table><div class="stamp">PAID</div>' +
                '<div class="foot">Thank you for trusting Kalto Law. info@kalto.law &middot; +250 790 000 000</div>' +
                '</body></html>';
            var win = window.open('', '_blank', 'width=700,height=900');
            if (win) { win.document.write(html); win.document.close(); win.print(); }
        }

        var newInvoiceBtn = document.getElementById('newInvoiceBtn');
        if (newInvoiceBtn) {
            newInvoiceBtn.addEventListener('click', async function() {
                try {
                    var res = await window.showCustomModal({
                        title: 'Create New Invoice',
                        icon: 'fa-file-invoice-dollar',
                        contentHTML: '<div class="form-group mb-md"><label for="invClient">Client Full Name *</label><input type="text" id="invClient" class="form-control" placeholder="e.g. Jane Uwase"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;"><div class="form-group"><label for="invAmount">Amount (RWF) *</label><input type="number" id="invAmount" class="form-control" placeholder="50000"></div><div class="form-group"><label for="invCase">Case Tracking Code</label><input type="text" id="invCase" class="form-control" placeholder="KL-XXXX-XXXX"></div></div><div class="form-group"><label for="invService">Service Description</label><input type="text" id="invService" class="form-control" placeholder="e.g. Legal consultation"></div>',
                        confirmText: 'Create Invoice'
                    });
                    if (res && res.invClient && res.invAmount) {
                        var invoiceId = 'INV-' + Date.now().toString().slice(-6);
                        await db.collection('invoices').add({ invoiceId: invoiceId, clientName: res.invClient, amount: Number(res.invAmount), caseCode: res.invCase || '', service: res.invService || '', status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                        window.showToast('Invoice ' + invoiceId + ' created!');
                        renderBillingTab();
                    }
                } catch(e) { /* cancelled */ }
            });
        }

