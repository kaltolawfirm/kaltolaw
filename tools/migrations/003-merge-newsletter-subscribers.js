// The website saves sign-ups to newsletter_subscribers; older ones were in
// subscribers. Copies those into newsletter_subscribers (one per email) so
// everything is in one place. The old documents are left untouched.
module.exports = {
    description: 'Copy old "subscribers" into "newsletter_subscribers"',
    async up({ db, admin, write, log }) {
        const [current, legacy] = await Promise.all([
            db.collection('newsletter_subscribers').get(),
            db.collection('subscribers').get()
        ]);
        const known = new Set(current.docs.map(d => String(d.data().email || '').trim().toLowerCase()));
        let n = 0;
        legacy.docs.forEach(doc => {
            const d = doc.data();
            const email = String(d.email || '').trim().toLowerCase();
            if (!email || known.has(email)) return;
            known.add(email);
            write.set(db.collection('newsletter_subscribers').doc(), {
                name: d.name || '',
                email,
                subscribedAt: d.subscribedAt || d.createdAt || d.timestamp || admin.firestore.FieldValue.serverTimestamp(),
                source: 'migrated from subscribers'
            });
            log('+ ' + email);
            n++;
        });
        return `${n} copied, ${legacy.size - n} already present or without email`;
    }
};
