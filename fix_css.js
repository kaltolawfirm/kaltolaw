const fs = require('fs');

let css = fs.readFileSync('css/style.css', 'utf8');

// The corrupted block ends with:
// .faq-answer p {
//     color: #FFF;
//     border-radius: 50px;

// We need to find exactly where it's corrupted and restore it.
let targetRegex = /\.faq-answer p \{\s+color: #FFF;\s+border-radius: 50px;/;

let replacement = `.faq-answer p {
    padding-bottom: 20px;
    color: var(--color-text-light);
    margin: 0;
}

/* WhatsApp Float Widget */
.whatsapp-float {
    display: none !important;
    position: fixed;
    width: 60px;
    height: 60px;
    bottom: 40px;
    right: 40px;
    background-color: #25d366;
    color: #FFF;
    border-radius: 50px;`;

if (targetRegex.test(css)) {
    css = css.replace(targetRegex, replacement);
    fs.writeFileSync('css/style.css', css);
    console.log('Fixed and updated style.css');
} else {
    console.log('Regex did not match. File might look different.');
    // fallback check
    if (css.includes('.faq-answer p {\r\n    color: #FFF;\r\n    border-radius: 50px;')) {
        css = css.replace('.faq-answer p {\r\n    color: #FFF;\r\n    border-radius: 50px;', replacement);
        fs.writeFileSync('css/style.css', css);
        console.log('Fixed with direct string replacement.');
    } else if (css.includes('.faq-answer p {\n    color: #FFF;\n    border-radius: 50px;')) {
         css = css.replace('.faq-answer p {\n    color: #FFF;\n    border-radius: 50px;', replacement);
        fs.writeFileSync('css/style.css', css);
        console.log('Fixed with direct string replacement (LF).');
    }
}
