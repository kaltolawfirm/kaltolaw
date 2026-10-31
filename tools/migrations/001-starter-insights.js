// Publishes the starter Legal Insights articles from js/admin-starter-posts.js.
// Articles already in the database (same seedKey or title) are skipped, the same
// rule the dashboard's "Load starter articles" button uses.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = {
    description: 'Add the starter Legal Insights articles',
    async up({ db, admin, write, log }) {
        const sandbox = { window: {} };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../js/admin-starter-posts.js'), 'utf8'), sandbox);
        const starters = sandbox.window.KL_STARTER_POSTS || [];

        const existing = (await db.collection('insights').get()).docs.map(d => d.data());
        const published = s => existing.some(p => p.seedKey === s.seedKey
            || String(p.title || '').trim().toLowerCase() === s.title.toLowerCase());
        const todo = starters.filter(s => !published(s));

        // Dated a week apart, newest first
        todo.forEach((s, i) => {
            write.set(db.collection('insights').doc(), {
                title: s.title, category: s.category, coverImage: s.coverImage,
                description: s.description, content: s.content, seedKey: s.seedKey,
                views: 0, likes: 0, comments: 0,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - i * 7 * 864e5))
            });
            log('+ ' + s.title);
        });
        return `${todo.length} added, ${starters.length - todo.length} already published`;
    }
};
