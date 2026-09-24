const fs = require('fs');
const path = require('path');
const dir = __dirname;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Comment out the CLIENTS button
    content = content.replace(/<a href="login\.html" class="btn btn-outline"(.*?)>(.*?)CLIENTS<\/a>/g, 
        '<!-- <a href="login.html" class="btn btn-outline"$1>$2CLIENTS</a> -->');
        
    fs.writeFileSync(filePath, content);
    console.log('Updated', file);
});

// Update style.css to fix layout wrapping
const cssPath = path.join(dir, 'css', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('@media (max-width: 1200px)')) {
    css += `
/* Fix Nav Layout for Medium Screens */
@media (max-width: 1200px) {
    .main-nav { display: none; }
    .mobile-menu-toggle { display: block; }
    .header-actions { margin-right: 20px; }
    .header-container { gap: 10px; }
}
`;
    fs.writeFileSync(cssPath, css);
    console.log('Updated style.css');
}
