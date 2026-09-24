const fs = require('fs');

const version = Date.now();
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Replace existing or missing version tags with new timestamp
    content = content.replace(/src="js\/main\.js(\?v=\d+)?"/g, `src="js/main.js?v=${version}"`);
    content = content.replace(/src="js\/bookings\.js(\?v=\d+)?"/g, `src="js/bookings.js?v=${version}"`);
    content = content.replace(/href="css\/style\.css(\?v=\d+)?"/g, `href="css/style.css?v=${version}"`);
    
    fs.writeFileSync(f, content);
});

console.log('Cache busting applied with version:', version);
