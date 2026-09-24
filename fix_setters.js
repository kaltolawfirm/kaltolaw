const fs = require('fs');

// 1. contact.html
let contact = fs.readFileSync('contact.html', 'utf8');
contact = contact.replace(
    /await db\.collection\('enquiries'\)\.add\(\{([\s\S]*?)\}\);/g,
    "await db.collection('enquiries').doc(docNumber).set({$1});"
);
fs.writeFileSync('contact.html', contact);

// 2. bookings.js
let bookings = fs.readFileSync('js/bookings.js', 'utf8');
bookings = bookings.replace(
    /await db\.collection\('appointments'\)\.add\(\{([\s\S]*?)\}\);/g,
    "await db.collection('appointments').doc(docNumber).set({$1});"
);
fs.writeFileSync('js/bookings.js', bookings);

// 3. portal-dashboard.js
let portal = fs.readFileSync('js/portal-dashboard.js', 'utf8');
portal = portal.replace(
    /await db\.collection\('appointments'\)\.add\(\{([\s\S]*?)\}\);/g,
    "await db.collection('appointments').doc(docNumber).set({$1});"
);
fs.writeFileSync('js/portal-dashboard.js', portal);

console.log('Done fixing setters');
