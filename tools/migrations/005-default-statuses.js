// Fills in statuses the dashboard assumes when they are missing, so filters
// and counters match what is stored.
//   enquiries.status            -> "unread"
//   client_uploads.approvalStatus -> "pending"
//   appointments.status         -> "Pending"
module.exports = {
    description: 'Fill in missing statuses on messages, uploads and appointments',
    async up({ db, write }) {
        const jobs = [
            ['enquiries', 'status', 'unread'],
            ['client_uploads', 'approvalStatus', 'pending'],
            ['appointments', 'status', 'Pending']
        ];
        const parts = [];
        for (const [col, field, value] of jobs) {
            const snap = await db.collection(col).get();
            let n = 0;
            snap.docs.forEach(doc => {
                if (doc.data()[field]) return;
                write.update(doc.ref, { [field]: value });
                n++;
            });
            parts.push(`${col}: ${n}`);
        }
        return parts.join(', ');
    }
};
