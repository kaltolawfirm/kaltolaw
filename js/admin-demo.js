// Dashboard demo mode: open admin.html?demo
// Replaces the Firebase SDK with an in-memory copy filled with sample data, so
// the dashboard can be explored without touching the real database. Nothing is
// saved: every change lasts until the page is reloaded. Outgoing emails are blocked.
(function () {
    var DAY = 864e5;
    var now = Date.now();
    var today = new Date(); today.setHours(0, 0, 0, 0);

    function T(ms) { return { toDate: function () { return new Date(ms); }, toMillis: function () { return ms; } }; }
    function ago(days, hours) { return T(now - days * DAY - (hours || 0) * 36e5); }
    // Calendar date (YYYY-MM-DD) relative to today, as the booking form stores it
    function day(offset) {
        var d = new Date(today.getTime() + offset * DAY);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    var SEED = {
        enquiries: [
            { name: 'Jeanne Uwase', email: 'jeanne.uwase@example.com', phone: '+250 788 120 451', service: 'Family Matters', message: 'I would like advice on child custody after separation. When could we meet?', status: 'unread', createdAt: ago(0, 2) },
            { name: 'Eric Mugisha', email: 'eric.mugisha@example.com', phone: '+250 783 554 210', service: 'Company Matters', message: 'We want to register a new limited company in Kigali and need help with the articles of association.', status: 'unread', createdAt: ago(0, 6) },
            { name: 'Aline Mukamana', email: 'aline.m@example.com', service: 'Labour Law', message: 'My employer terminated my contract without notice. Do I have a claim?', status: 'unread', createdAt: ago(1, 3) },
            { name: 'Patrick Habimana', email: 'p.habimana@example.com', phone: '+250 722 301 998', service: 'Real Estate & Estate Planning', message: 'Need a lawyer to review a land sale agreement before signing next week.', status: 'read', createdAt: ago(2, 1) },
            { name: 'Diane Ingabire', email: 'diane.ingabire@example.com', service: 'Commercial Matters', message: 'A supplier has not delivered goods we paid for in advance. What are our options?', status: 'replied', createdAt: ago(4) },
            { name: 'Olivier Nshimiyimana', email: 'olivier.n@example.com', service: 'Tax Law', message: 'Questions about VAT registration for a small consultancy.', status: 'approved', createdAt: ago(6) },
            { name: 'Claudine Uwimana', email: 'claudine.u@example.com', service: 'Consumer Protection', message: 'Bought a faulty phone and the shop refuses a refund.', status: 'replied', createdAt: ago(9) },
            { name: 'Samuel Ndayisaba', email: 'samuel.nd@example.com', phone: '+250 785 667 012', service: 'Corporate Law', message: 'Shareholder dispute in our family business, need mediation.', status: 'read', createdAt: ago(13) },
            { name: 'Grace Mutoni', email: 'grace.mutoni@example.com', service: 'Family Matters', message: 'Help drafting a will and planning succession.', status: 'replied', createdAt: ago(18) },
            { name: 'Kevin Rugamba', email: 'k.rugamba@example.com', service: 'ADR', message: 'Interested in arbitration for a construction contract dispute.', status: 'approved', createdAt: ago(25) }
        ],
        cases: [
            { clientName: 'Olivier Nshimiyimana', clientPhone: '+250 788 410 220', trackingCode: 'KL-7QX2-4185', status: 'Review', description: 'VAT registration and tax compliance review', documents: [{ name: 'Engagement letter', url: 'https://example.com/engagement.pdf', signed: true }], createdAt: ago(6), lastUpdated: ago(1) },
            { clientName: 'Kevin Rugamba', trackingCode: 'KL-M3PA-7720', status: 'Approved', description: 'Arbitration: construction contract dispute', documents: [{ name: 'Statement of claim', url: 'https://example.com/claim.pdf' }, { name: 'Arbitration agreement', url: 'https://example.com/agreement.pdf', requiresSignature: true }], createdAt: ago(25), lastUpdated: ago(2) },
            { clientName: 'Marie Claire Iradukunda', trackingCode: 'KL-B8TD-3051', status: 'Initiated', description: 'Divorce proceedings and division of assets', documents: [], createdAt: ago(3), lastUpdated: ago(3) },
            { clientName: 'Jean Bosco Hakizimana', trackingCode: 'KL-H5WN-9264', status: 'Review', description: 'Land boundary dispute in Huye District', documents: [{ name: 'Land title copy', url: 'https://example.com/title.pdf' }], createdAt: ago(40), lastUpdated: ago(5) },
            { clientName: 'Inzozi Tech Ltd', trackingCode: 'KL-R2KC-6608', status: 'Approved', description: 'Company formation and shareholder agreement', documents: [{ name: 'Articles of association', url: 'https://example.com/articles.pdf' }], createdAt: ago(30), lastUpdated: ago(8) },
            { clientName: 'Beatrice Nyirahabimana', trackingCode: 'KL-Z9EV-1147', status: 'Initiated', description: 'Unfair dismissal claim against former employer', documents: [], createdAt: ago(1), lastUpdated: ago(1) },
            { clientName: 'Akagera Foods Co.', trackingCode: 'KL-F4LS-5532', status: 'Closed', description: 'Supplier contract breach, settled', documents: [{ name: 'Settlement agreement', url: 'https://example.com/settlement.pdf', signed: true }], createdAt: ago(90), lastUpdated: ago(20) },
            { clientName: 'Emmanuel Twagirayezu', trackingCode: 'KL-C6YU-8890', status: 'Closed', description: 'Will drafting and estate plan', documents: [{ name: 'Final will', url: 'https://example.com/will.pdf', signed: true }], createdAt: ago(75), lastUpdated: ago(33) },
            { clientName: 'Josiane Mukeshimana', trackingCode: 'KL-P1GH-2276', status: 'Rejected', description: 'Consumer claim, outside limitation period', documents: [], createdAt: ago(50), lastUpdated: ago(41) }
        ],
        appointments: [
            { name: 'Jeanne Uwase', email: 'jeanne.uwase@example.com', service: 'Family Matters', date: day(0), time: '15:00', status: 'Confirmed', createdAt: ago(1) },
            { name: 'Eric Mugisha', email: 'eric.mugisha@example.com', service: 'Company Matters', date: day(1), time: '10:30', status: 'Pending', createdAt: ago(0, 5) },
            { name: 'Aline Mukamana', email: 'aline.m@example.com', service: 'Labour Law', date: day(2), time: '09:00', status: 'Pending', createdAt: ago(1, 2) },
            { name: 'Patrick Habimana', email: 'p.habimana@example.com', service: 'Real Estate & Estate Planning', date: day(4), time: '14:00', status: 'Confirmed', createdAt: ago(2) },
            { name: 'Inzozi Tech Ltd', email: 'legal@inzozi.example.com', service: 'Corporate Law', date: day(6), time: '11:00', status: 'Confirmed', createdAt: ago(5) },
            { name: 'Diane Ingabire', email: 'diane.ingabire@example.com', service: 'Commercial Matters', date: day(9), time: '16:00', status: 'Pending', createdAt: ago(3) },
            { name: 'Kevin Rugamba', email: 'k.rugamba@example.com', service: 'ADR', date: day(-3), time: '10:00', status: 'Completed', createdAt: ago(12) },
            { name: 'Olivier Nshimiyimana', email: 'olivier.n@example.com', service: 'Tax Law', date: day(-6), time: '13:30', status: 'Completed', createdAt: ago(8) },
            { name: 'Grace Mutoni', email: 'grace.mutoni@example.com', service: 'Family Matters', date: day(-10), time: '09:30', status: 'Completed', createdAt: ago(16) },
            { name: 'Samuel Ndayisaba', email: 'samuel.nd@example.com', service: 'Corporate Law', date: day(-12), time: '15:30', status: 'Cancelled', createdAt: ago(14) },
            { name: 'Claudine Uwimana', email: 'claudine.u@example.com', service: 'Consumer Protection', date: day(-17), time: '11:30', status: 'Completed', createdAt: ago(20) }
        ],
        invoices: [
            { invoiceId: 'INV-240611', clientName: 'Akagera Foods Co.', amount: 850000, caseCode: 'KL-F4LS-5532', service: 'Contract dispute representation', status: 'paid', createdAt: ago(160), paidAt: ago(150) },
            { invoiceId: 'INV-240702', clientName: 'Emmanuel Twagirayezu', amount: 300000, caseCode: 'KL-C6YU-8890', service: 'Will drafting', status: 'paid', createdAt: ago(130), paidAt: ago(122) },
            { invoiceId: 'INV-240815', clientName: 'Inzozi Tech Ltd', amount: 650000, caseCode: 'KL-R2KC-6608', service: 'Company formation', status: 'paid', createdAt: ago(100), paidAt: ago(92) },
            { invoiceId: 'INV-240903', clientName: 'Kevin Rugamba', amount: 1200000, caseCode: 'KL-M3PA-7720', service: 'Arbitration retainer', status: 'paid', createdAt: ago(70), paidAt: ago(60) },
            { invoiceId: 'INV-240921', clientName: 'Jean Bosco Hakizimana', amount: 450000, caseCode: 'KL-H5WN-9264', service: 'Land dispute: first phase', status: 'paid', createdAt: ago(45), paidAt: ago(38) },
            { invoiceId: 'INV-241004', clientName: 'Grace Mutoni', amount: 150000, service: 'Succession consultation', status: 'paid', createdAt: ago(28), paidAt: ago(24) },
            { invoiceId: 'INV-241012', clientName: 'Olivier Nshimiyimana', amount: 400000, caseCode: 'KL-7QX2-4185', service: 'Tax compliance review', status: 'pending', createdAt: ago(18) },
            { invoiceId: 'INV-241020', clientName: 'Jean Bosco Hakizimana', amount: 380000, caseCode: 'KL-H5WN-9264', service: 'Land dispute: second phase', status: 'pending', createdAt: ago(9) },
            { invoiceId: 'INV-241027', clientName: 'Marie Claire Iradukunda', amount: 250000, caseCode: 'KL-B8TD-3051', service: 'Divorce proceedings retainer', status: 'pending', createdAt: ago(2) }
        ],
        client_uploads: [
            { caseCode: 'KL-H5WN-9264', fileName: 'land_survey_report.pdf', fileSize: 1843200, url: 'https://example.com/survey.pdf', approvalStatus: 'pending', uploadedAt: ago(0, 4) },
            { caseCode: 'KL-B8TD-3051', fileName: 'marriage_certificate.pdf', fileSize: 412000, url: 'https://example.com/marriage.pdf', approvalStatus: 'pending', uploadedAt: ago(1) },
            { caseCode: 'KL-Z9EV-1147', fileName: 'employment_contract.docx', fileSize: 96000, url: 'https://example.com/contract.docx', approvalStatus: 'pending', uploadedAt: ago(1, 5) },
            { caseCode: 'KL-7QX2-4185', fileName: 'vat_returns_2025.pdf', fileSize: 655000, url: 'https://example.com/vat.pdf', approvalStatus: 'approved', uploadedAt: ago(4) },
            { caseCode: 'KL-M3PA-7720', fileName: 'site_photos.jpg', fileSize: 2300000, url: 'https://example.com/photos.jpg', approvalStatus: 'approved', uploadedAt: ago(11) }
        ],
        insights: [
            { title: 'Registering a company in Rwanda: a step-by-step guide', category: 'Corporate Law', coverImage: 'images/blog-img-3.jpg', description: 'What founders need to prepare before registering with RDB, from articles of association to beneficial ownership.', content: '<p>Registering a company in Rwanda is fast, but preparation matters.</p>', views: 342, likes: 21, comments: 4, createdAt: ago(5) },
            { title: 'Your rights when an employment contract ends', category: 'Labour Law', coverImage: 'images/blog-img-4.jpg', description: 'Notice periods, terminal benefits and when a dismissal is unfair under Rwandan labour law.', content: '<p>Ending an employment contract follows clear rules.</p>', views: 518, likes: 37, comments: 9, createdAt: ago(19) },
            { title: 'Mediation or court? Choosing how to resolve a dispute', category: 'ADR', coverImage: 'images/blog-img-5.jpg', description: 'How mediation and arbitration compare with litigation on cost, time and privacy.', content: '<p>Not every dispute needs a courtroom.</p>', views: 207, likes: 14, comments: 2, createdAt: ago(41) }
        ],
        users: [
            { name: 'Olivier Nshimiyimana', email: 'olivier.n@example.com', phone: '+250 788 410 220', createdAt: ago(6) },
            { name: 'Kevin Rugamba', email: 'k.rugamba@example.com', createdAt: ago(24) },
            { name: 'Jean Bosco Hakizimana', email: 'jb.hakizimana@example.com', createdAt: ago(39) },
            { name: 'Marie Claire Iradukunda', email: 'mc.iradukunda@example.com', createdAt: ago(3) }
        ],
        ratings: [{ stars: 5 }, { stars: 5 }, { stars: 4 }, { stars: 5 }, { stars: 4 }, { stars: 5 }],
        tasks: [
            { title: 'File statement of defence', description: 'Land dispute, Huye Intermediate Court', caseCode: 'KL-H5WN-9264', deadline: day(-2), status: 'progress' },
            { title: 'Draft shareholder agreement', description: 'Inzozi Tech Ltd', caseCode: 'KL-R2KC-6608', deadline: day(3), status: 'todo' },
            { title: 'Prepare client for arbitration hearing', caseCode: 'KL-M3PA-7720', deadline: day(5), status: 'todo' },
            { title: 'Review VAT returns', caseCode: 'KL-7QX2-4185', deadline: day(1), status: 'progress' },
            { title: 'Collect asset list for divorce filing', caseCode: 'KL-B8TD-3051', deadline: day(10), status: 'todo' },
            { title: 'Send settlement copy to client', caseCode: 'KL-F4LS-5532', deadline: day(-20), status: 'done' }
        ]
    };

    // ── In-memory Firestore (the subset js/admin.js and js/kh-editor.js use) ──
    var store = {};
    var seq = 0;
    Object.keys(SEED).forEach(function (c) {
        store[c] = {};
        SEED[c].forEach(function (d, i) { store[c][c + '-' + (i + 1)] = d; });
    });
    function col(c) { return store[c] || (store[c] = {}); }
    function copy(o) { return o && Object.assign({}, o); }
    function val(v) { return v && typeof v.toMillis === 'function' ? v.toMillis() : v; }
    function snapOf(docs) { return { size: docs.length, empty: !docs.length, docs: docs, forEach: function (f) { docs.forEach(f); } }; }
    function docSnap(c, id) {
        return { id: id, exists: !!col(c)[id], data: function () { return copy(col(c)[id]); }, ref: ref(c, id) };
    }
    function ref(c, id) {
        return {
            id: id,
            get: function () { return Promise.resolve(docSnap(c, id)); },
            set: function (v, opt) { col(c)[id] = opt && opt.merge ? Object.assign(col(c)[id] || {}, v) : Object.assign({}, v); return Promise.resolve(); },
            update: function (v) {
                if (!col(c)[id]) return Promise.reject(new Error('Demo: document not found'));
                Object.assign(col(c)[id], v); return Promise.resolve();
            },
            delete: function () { delete col(c)[id]; return Promise.resolve(); }
        };
    }
    function query(c, ops) {
        ops = ops || [];
        var q = {
            orderBy: function (f, dir) { return query(c, ops.concat([['orderBy', f, dir]])); },
            limit: function (n) { return query(c, ops.concat([['limit', n]])); },
            where: function (f, op, v) { return query(c, ops.concat([['where', f, op, v]])); },
            get: function () {
                var docs = Object.keys(col(c)).map(function (id) { return docSnap(c, id); });
                ops.forEach(function (o) {
                    if (o[0] === 'where') docs = docs.filter(function (d) { var x = d.data()[o[1]]; return o[2] === '==' ? x === o[3] : true; });
                    if (o[0] === 'orderBy') docs.sort(function (a, b) {
                        var x = val(a.data()[o[1]]), y = val(b.data()[o[1]]);
                        return (x > y ? 1 : x < y ? -1 : 0) * (o[2] === 'desc' ? -1 : 1);
                    });
                    if (o[0] === 'limit') docs = docs.slice(0, o[1]);
                });
                return Promise.resolve(snapOf(docs));
            },
            onSnapshot: function (next) { q.get().then(next); return function () {}; },
            doc: function (id) { return ref(c, id || c + '-new-' + (++seq)); },
            add: function (v) {
                var id = c + '-new-' + (++seq);
                col(c)[id] = Object.assign({}, v);
                return Promise.resolve(ref(c, id));
            }
        };
        return q;
    }
    var firestore = {
        collection: query,
        batch: function () {
            var ops = [];
            return { set: function (r, v, opt) { ops.push(function () { return r.set(v, opt); }); }, commit: function () { return Promise.all(ops.map(function (f) { return f(); })); } };
        }
    };
    var user = { email: 'demo@kalto.law', uid: 'demo-admin', displayName: 'Demo Administrator' };
    // Let the demo account past the dashboard's staff check (admin.html sets the list later)
    Object.defineProperty(window, 'KL_STAFF_EMAILS', { configurable: true, get: function () { return [user.email]; }, set: function () {} });
    var auth = {
        currentUser: user,
        onAuthStateChanged: function (f) { setTimeout(function () { f(user); }, 0); return function () {}; },
        signInWithEmailAndPassword: function () { return Promise.resolve({ user: user }); },
        signOut: function () { location.href = location.pathname; return Promise.resolve(); }
    };
    var serverTimestamp = function () { return T(Date.now()); };

    window.firebase = {
        apps: [],
        initializeApp: function () { this.apps.push({}); return {}; },
        app: function () { return { functions: function () { return { httpsCallable: function () { return function () { return Promise.resolve({ data: { success: true } }); }; } }; } }; },
        auth: function () { return auth; },
        firestore: Object.assign(function () { return firestore; }, {
            FieldValue: { serverTimestamp: serverTimestamp },
            Timestamp: { fromDate: function (d) { return T(d.getTime()); } }
        }),
        storage: function () { return {}; }
    };

    // Replies normally email the client through Formspree; never in demo mode
    var realFetch = window.fetch;
    window.fetch = function (url, opts) {
        if (/formspree\.io/.test(String(url))) return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
        return realFetch.apply(this, arguments);
    };

    // Banner so sample data is never mistaken for real clients
    document.addEventListener('DOMContentLoaded', function () {
        var bar = document.createElement('div');
        bar.className = 'kd-demo-bar';
        bar.setAttribute('role', 'status');
        bar.innerHTML = '<i class="fa-solid fa-flask" aria-hidden="true"></i><span><strong>Demo mode.</strong> Sample data only. Changes are not saved and no emails are sent.</span><a href="' + location.pathname + '">Exit demo</a>';
        document.body.prepend(bar);
        document.body.classList.add('is-demo');
        var email = document.getElementById('klAccountEmail');
        if (email) email.textContent = user.email;
    });
})();
