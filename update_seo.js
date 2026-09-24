const fs = require('fs');

const metaTags = `
    <!-- SEO & Social Meta Tags -->
    <meta name="description" content="Kalto Law provides premium corporate, commercial, and real estate legal services in Rwanda. Book a consultation today.">
    <meta name="keywords" content="Lawyer Rwanda, Corporate Law Kigali, Legal Services Rwanda, Real Estate Lawyer, Kalto Law">
    <meta property="og:title" content="Kalto Law - Premium Legal Services in Rwanda">
    <meta property="og:description" content="Expert legal representation in Corporate Law, Real Estate, and Commercial Matters.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://kalto-law.web.app">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Kalto Law - Premium Legal Services">
    <meta name="twitter:description" content="Expert legal representation in Corporate Law, Real Estate, and Commercial Matters.">
`;

let html = fs.readFileSync('index.html', 'utf8');

if (!html.includes('<meta name="description" content="Kalto Law')) {
    html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0">', '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + metaTags);
    fs.writeFileSync('index.html', html);
    console.log('Added SEO tags to index.html');
} else {
    console.log('SEO tags already in index.html');
}
