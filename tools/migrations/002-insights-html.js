// Older articles were typed as plain text. The site now shows them as
// paragraphs, but storing them as HTML keeps the editor and the site in step.
// Same conversion as js/kh-rich.js: blank lines separate paragraphs.
const looksLikeHtml = s => /<(p|h[1-6]|ul|ol|li|br|div|strong|em|b|i|blockquote|a)\b/i.test(s || '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toHtml = text => String(text).split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
    .map(b => '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>').join('');

module.exports = {
    description: 'Convert plain-text Legal Insights articles to HTML paragraphs',
    async up({ db, write, log }) {
        const snap = await db.collection('insights').get();
        let n = 0;
        snap.docs.forEach(doc => {
            const content = doc.data().content;
            if (!content || looksLikeHtml(content)) return;
            write.update(doc.ref, { content: toHtml(content) });
            log('~ ' + (doc.data().title || doc.id));
            n++;
        });
        return `${n} of ${snap.size} articles converted`;
    }
};
