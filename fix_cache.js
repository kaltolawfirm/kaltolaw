const fs = require('fs');

const files = ['portal.html', 'contact.html', 'index.html', 'track-case.html'];
const version = '?v=' + Date.now();

files.forEach(f => {
    if(fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        content = content.replace(/src="js\/portal-dashboard\.js"/g, 'src="js/portal-dashboard.js' + version + '"');
        content = content.replace(/src="js\/bookings\.js"/g, 'src="js/bookings.js' + version + '"');
        content = content.replace(/src="js\/tracking\.js"/g, 'src="js/tracking.js' + version + '"');
        content = content.replace(/src="js\/main\.js"/g, 'src="js/main.js' + version + '"');
        fs.writeFileSync(f, content);
    }
});
console.log('Cache busting applied');
