const fs = require('fs');
const file = 'js/admin.js';
let content = fs.readFileSync(file, 'utf8');
const searchString = "openView.style.display = 'none'; closedView.style.display = 'block';";
const idx1 = content.indexOf(searchString);
if (idx1 > -1) {
    // Find the next };
    const idx2 = content.indexOf('};', idx1);
    if (idx2 > -1) {
        content = content.substring(0, idx1) + content.substring(idx2 + 2);
        fs.writeFileSync(file, content);
        console.log("Fixed via substring");
    }
}
