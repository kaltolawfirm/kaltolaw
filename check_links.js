const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let count = 0;

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    
    // Check if there's any btn_book that doesn't go to contact.html
    const matches = content.match(/<a[^>]*Book Consultation[^>]*>/gi);
    if (matches) {
        matches.forEach(m => {
            if (!m.includes('href="contact.html"')) {
                console.log(f, 'has bad link:', m);
                count++;
            }
        });
    }
});

console.log('Done checking links. Issues:', count);
