const fs = require('fs');

function updateFile(filename, imgSearchRegex, imgReplaceString) {
    if (!fs.existsSync(filename)) {
        console.log(filename + " not found");
        return;
    }
    let html = fs.readFileSync(filename, 'utf8');
    let modified = html.replace(imgSearchRegex, imgReplaceString);
    if (html !== modified) {
        fs.writeFileSync(filename, modified);
        console.log('Updated ' + filename);
    } else {
        console.log('No changes needed or matched in ' + filename);
    }
}

// 1. about.html: "Our Mission" -> MISSION.jpg and fit
updateFile('about.html', 
    /<img src="images\/MISSION\.jpg" alt="Our Mission"\s+style="width: 100%; height: 400px; object-fit: cover; border-radius: var\(--radius-md\); box-shadow: var\(--shadow-md\);">/,
    '<img src="images/MISSION.jpg" alt="Our Mission"\n                    style="width: 100%; height: 400px; object-fit: cover; object-position: center 25%; border-radius: var(--radius-md); box-shadow: var(--shadow-md);">'
);

// 2. corporate-law.html: "Corporate Law" -> elite (1)
updateFile('corporate-law.html',
    /<img src="images\/[^"]+" alt="Corporate Law"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/elite (1).jpg.jpeg" alt="Corporate Law"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

// 3. company-matters.html: "Company Matters" -> elite (1)
updateFile('company-matters.html',
    /<img src="images\/[^"]+" alt="Company [mM]atters"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/elite (1).jpg.jpeg" alt="Company Matters"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

// 4. commercial-matters.html: "Commercial Matters" -> MISSION
updateFile('commercial-matters.html',
    /<img src="images\/[^"]+" alt="Commercial [mM]atters"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/MISSION.jpg" alt="Commercial Matters"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

// 5. real-estate-planning.html: "Real Estate Planning" -> elite (4)
updateFile('real-estate-planning.html',
    /<img src="images\/[^"]+" alt="Real Estate Planning"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/elite (4).jpg.jpeg" alt="Real Estate Planning"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

// 6. labour-law.html: "Labour Law" -> keep image but fit
updateFile('labour-law.html',
    /<img src="images\/([^"]+)" alt="Labour Law"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/$1" alt="Labour Law"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

// 7. consumer-protection.html: "Consumer" -> elite (1)
updateFile('consumer-protection.html',
    /<img src="images\/[^"]+" alt="Consumer Protection"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/elite (1).jpg.jpeg" alt="Consumer Protection"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

// 8. tax-law.html: "Tax Law" -> keep image but fit
updateFile('tax-law.html',
    /<img src="images\/([^"]+)" alt="Tax Law"\s+style="width: 100%; height: 500px; object-fit: cover;">/,
    '<img src="images/$1" alt="Tax Law"\n                            style="width: 100%; height: 500px; object-fit: cover; object-position: center 25%;">'
);

