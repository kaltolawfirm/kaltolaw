const fs = require('fs');
const file = 'js/admin.js';
let content = fs.readFileSync(file, 'utf8');

const orphanedBlock = [
    "                openView.style.display = 'none'; closedView.style.display = 'block';",
    "                btnOpen.style.borderBottomColor = 'transparent'; btnOpen.style.color = 'var(--admin-text-muted)';",
    "                btnClosed.style.borderBottomColor = 'var(--admin-accent)'; btnClosed.style.color = 'var(--admin-sidebar-bg)';",
    "            }",
    "        };"
].join('\n');

content = content.replace(orphanedBlock, '');
fs.writeFileSync(file, content);
console.log("Done");
