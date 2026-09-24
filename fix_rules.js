const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
    /match \/enquiries\/\{document=\*\*\} \{\s*allow create: if true;\s*allow read, update, delete: if isAdmin\(\);\s*\}/,
    `match /enquiries/{document=**} {\n      allow create: if true;\n      allow get: if true;\n      allow list, update, delete: if isAdmin();\n    }`
);

rules = rules.replace(
    /match \/appointments\/\{document=\*\*\} \{\s*\/\/ Allow public to create bookings, restrict read\/update to admin\s*allow create: if true;\s*allow read: if isAdmin\(\) \|\| \(request\.auth != null && isOwner\(resource\.data\.uid\)\);\s*allow update, delete: if isAdmin\(\);\s*\}/,
    `match /appointments/{document=**} {\n      allow create: if true;\n      allow get: if true;\n      allow list: if isAdmin() || (request.auth != null && isOwner(resource.data.uid));\n      allow update, delete: if isAdmin();\n    }`
);

rules = rules.replace(
    /match \/cases\/\{document=\*\*\} \{\s*allow read: if isAdmin\(\) \|\| \(request\.auth != null && resource\.data\.uid == request\.auth\.uid\);/,
    `match /cases/{document=**} {\n      allow get: if true;\n      allow list: if isAdmin() || (request.auth != null && resource.data.uid == request.auth.uid);`
);

fs.writeFileSync('firestore.rules', rules);
console.log('Rules updated');
