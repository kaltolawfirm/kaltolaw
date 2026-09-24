const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && (file === 'js' || dir === __dirname)) {
            if (file !== 'node_modules' && file !== '.firebase' && file !== 'functions') {
                 processDir(fullPath);
            }
        } else if (stat.isFile() && (file.endsWith('.html') || file.endsWith('.js'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = content.replace(/\brepresentation\b/g, 'advising')
                                 .replace(/\bRepresentation\b/g, 'Advising');
            if (content !== updated) {
                fs.writeFileSync(fullPath, updated);
                console.log('Updated', fullPath);
            }
        }
    });
}
processDir(__dirname);
