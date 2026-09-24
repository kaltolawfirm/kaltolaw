const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Add jsPDF CDNs to head
if (!html.includes('jspdf.umd.min.js')) {
    html = html.replace('</head>', `    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>\n</head>`);
    fs.writeFileSync('admin.html', html);
    console.log('Added jsPDF to admin.html');
} else {
    console.log('jsPDF already added');
}
