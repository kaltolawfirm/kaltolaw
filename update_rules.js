const fs = require('fs');

let rules = fs.readFileSync('firestore.rules', 'utf8');

// Fix Appointments rules to allow public creation
let oldAppointments = `    match /appointments/{document=**} {
      // clients can create and read their own; admin can do all
      allow create: if request.auth != null;
      allow read: if isAdmin() || isOwner(resource.data.uid);
      allow update, delete: if isAdmin();
    }`;

let newAppointments = `    match /appointments/{document=**} {
      // Allow public to create bookings, restrict read/update to admin
      allow create: if true;
      allow read: if isAdmin() || (request.auth != null && isOwner(resource.data.uid));
      allow update, delete: if isAdmin();
    }`;

rules = rules.replace(oldAppointments, newAppointments);

fs.writeFileSync('firestore.rules', rules);
console.log('Updated firestore.rules for appointments');
