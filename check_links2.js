const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let count = 0;

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    
    const matches = content.match(/<a[^>]*Consultation[^>]*>/gi);
    if (matches) {
        matches.forEach(m => {
            if (!m.includes('href="contact.html') && !m.includes('href="contact.html?')) {
                console.log(f, 'has bad link:', m);
                count++;
            }
        });
    }
    
    // Check buttons that say "Consultation"
    const btnMatches = content.match(/<button[^>]*Consultation[^>]*>/gi);
    if (btnMatches) {
        btnMatches.forEach(m => {
            console.log(f, 'has button:', m);
        });
    }
});

console.log('Done checking links. Issues:', count);
