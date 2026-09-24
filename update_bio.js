const fs = require('fs');

// 1. Update js/translations.js
let trans = fs.readFileSync('js/translations.js', 'utf8');
trans = trans.replace(/\*\*Integrity, Excellence, and Strategy\*\*/g, 'Integrity, Excellence, and Strategy');
trans = trans.replace(
    /"about_founder_bio":\s*"[^"]+"/g, 
    `"about_founder_bio": "A dedicated legal professional who founded KALTO LAW with a commitment to excellence and integrity in legal representation. He has built a strong reputation in Rwanda for strategic advocacy and client-focused service. He completed his legal studies at UNILAK University."`
);
fs.writeFileSync('js/translations.js', trans);
console.log('Updated translations.js');

// 2. Update team.html
let teamHtml = fs.readFileSync('team.html', 'utf8');
teamHtml = teamHtml.replace(
    /<p class="mb-md">\s*With over two decades of experience in high-stakes corporate litigation and[\s\S]*?unrelenting advocacy\.<\/p>/g,
    `<p class="mb-md">A dedicated legal professional who founded KALTO LAW with a commitment to excellence and integrity in legal representation. He has built a strong reputation in Rwanda for strategic advocacy and client-focused service.</p>`
);
teamHtml = teamHtml.replace(
    /<p class="mb-md">\s*Education: LL\.M\. in International Business Law\.<br>Admissions: Rwanda Bar\s*Association\.<\/p>/g,
    `<p class="mb-md">Education: Bachelor of Laws (LL.B.), UNILAK University.<br>Admissions: Rwanda Bar Association.</p>`
);
fs.writeFileSync('team.html', teamHtml);
console.log('Updated team.html');
