const fs = require('fs');
let c = fs.readFileSync('contact.html', 'utf8');

c = c.replace(
    /docNumber: 'KALTO-' \+ Math\.floor\(100000 \+ Math\.random\(\) \* 900000\),/g,
    'docNumber: docNumber,'
);

c = c.replace(
    /await db\.collection\('enquiries'\)\.add\(\{/g,
    'const docNumber = \'KALTO-\' + Math.floor(100000 + Math.random() * 900000);\n                await db.collection(\'enquiries\').add({'
);

c = c.replace(
    /Your tracking number is generated/g,
    'Your tracking number is: ${docNumber}'
);

c = c.replace(
    /Please save your tracking number \(check the confirmation email\)\./g,
    'Your tracking number is: ${docNumber}. Please save it for your records.'
);

fs.writeFileSync('contact.html', c);
console.log("Done");
