const fs = require('fs');
let c = fs.readFileSync('track-case.html', 'utf8');

const targetStr = '<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"></script>';
const replacementStr = '<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"></script>\n    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-functions-compat.js"></script>';

c = c.replace(targetStr, replacementStr);
fs.writeFileSync('track-case.html', c);
console.log("Done");
