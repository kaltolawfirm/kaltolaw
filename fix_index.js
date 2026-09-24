const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_2_title">Proven Track
                        <h3>Stay Informed on Legal Matters</h3>`;

const replaceStr = `                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_2_title">Proven Track
                                Record:</strong> <span data-i18n="why_2_desc">History of
                                successful verdicts.</span></li>
                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_3_title">Transparent
                                Communication:</strong> <span data-i18n="why_3_desc">You
                                are always informed.</span></li>
                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_4_title">Strategic
                                Integrity:</strong> <span data-i18n="why_4_desc">Ethical
                                and smart legal solutions.</span></li>
                    </ul>
                    <a href="team.html" class="btn btn-primary mt-md" data-i18n="why_btn">Meet the Team</a>
                </div>
                <div class="why-image">
                    <!-- Choose Image -->
                    <img src="images/why i choose.jpeg" alt="Why Choose KALTO LAW"
                        style="width: 100%; height: auto; max-height: 500px; object-fit: cover; object-position: center 25%; border-radius: var(--radius-md); box-shadow: var(--shadow-lg);">
                </div>
            </div>
        </div>
    </section>

    <!-- Newsletter Section -->
    <section class="newsletter-section">
        <div class="container">
            <div class="newsletter-inner">
                <div class="newsletter-text">
                    <i class="fa-solid fa-envelope-open-text newsletter-icon"></i>
                    <div>
                        <h3>Stay Informed on Legal Matters</h3>`;

if(html.includes('                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_2_title">Proven Track\r\n                        <h3>Stay Informed on Legal Matters</h3>')) {
    html = html.replace('                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_2_title">Proven Track\r\n                        <h3>Stay Informed on Legal Matters</h3>', replaceStr);
} else if(html.includes('                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_2_title">Proven Track\n                        <h3>Stay Informed on Legal Matters</h3>')) {
    html = html.replace('                        <li><i class="fa-solid fa-check text-gold"></i> <strong data-i18n="why_2_title">Proven Track\n                        <h3>Stay Informed on Legal Matters</h3>', replaceStr);
}

fs.writeFileSync('index.html', html);
console.log('Fixed index.html');
