// The dashboard lists template requests by requestedAt (what legal-templates.html
// saves). Older requests stored the date as timestamp or createdAt, and a
// Firestore query sorted by requestedAt leaves out documents without it.
module.exports = {
    description: 'Give older template requests a requestedAt date',
    async up({ db, admin, write }) {
        const snap = await db.collection('template_requests').get();
        let n = 0;
        snap.docs.forEach(doc => {
            const d = doc.data();
            if (d.requestedAt) return;
            write.update(doc.ref, { requestedAt: d.timestamp || d.createdAt || admin.firestore.FieldValue.serverTimestamp() });
            n++;
        });
        return `${n} of ${snap.size} requests updated`;
    }
};
