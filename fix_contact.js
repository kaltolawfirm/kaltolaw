const fs = require('fs');
let c = fs.readFileSync('contact.html', 'utf8');

c = c.replace(
    'createdAt: firebase.firestore.FieldValue.serverTimestamp(),',
    'docNumber: \'KALTO-\' + Math.floor(100000 + Math.random() * 900000),\n                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),'
);

c = c.replace(
    'toast.innerHTML = \'<i class="fa-solid fa-circle-check" style="color: var(--color-accent);"></i> Message received! We\\\'ll contact you soon.\';',
    'toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-accent);"></i> Message received! Your tracking number is generated. We\\\'ll contact you soon.`;'
);

c = c.replace(
    'toast.className = "show";',
    'toast.className = "show";\n                    setTimeout(() => alert(`Message received successfully! Please save your tracking number (check the confirmation email).`), 500);'
);

fs.writeFileSync('contact.html', c);
console.log("Done");
