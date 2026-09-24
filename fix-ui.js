const fs = require('fs');

try {
    // 1. Fix about.html image
    let about = fs.readFileSync('about.html', 'utf8');
    about = about.replace('style="width: 100%; height: 400px; object-fit: cover;', 'style="width: 100%; height: 400px; object-fit: cover; object-position: top center;');
    fs.writeFileSync('about.html', about);
    console.log('Fixed about.html image CSS');

    // 2. Fix index.html image
    let index = fs.readFileSync('index.html', 'utf8');
    index = index.replace('style="width: 100%; height: auto; max-height: 500px; object-fit: cover;', 'style="width: 100%; height: auto; max-height: 500px; object-fit: cover; object-position: top center;');
    fs.writeFileSync('index.html', index);
    console.log('Fixed index.html image CSS');

    // 3. Fix main.js to dispatch translationsApplied event
    let main = fs.readFileSync('js/main.js', 'utf8');
    if (!main.includes('translationsApplied')) {
        main = main.replace('document.documentElement.lang = lang;', 'document.documentElement.lang = lang;\\n        window.dispatchEvent(new Event("translationsApplied"));');
        fs.writeFileSync('js/main.js', main);
        console.log('Added translationsApplied event to main.js');
    }

    // 4. Update contact.html script
    let contact = fs.readFileSync('contact.html', 'utf8');
    const newScript = `<script>
        document.addEventListener('DOMContentLoaded', function () {
            function getQueryParam(name) {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get(name);
            }
            const serviceParam = getQueryParam('service');
            
            function applyService() {
                if (serviceParam) {
                    const selectElement = document.getElementById('service');
                    if (selectElement) {
                        selectElement.value = serviceParam;
                        selectElement.dispatchEvent(new Event('change'));
                        
                        // Force options directly just in case value setting fails
                        const option = selectElement.querySelector('option[value="' + serviceParam + '"]');
                        if (option) option.selected = true;
                    }
                }
            }
            
            applyService();
            
            // Listen to the custom event from main.js when translations are done
            window.addEventListener('translationsApplied', applyService);
            
            // Fallback interval
            let attempts = 0;
            const interval = setInterval(function() {
                applyService();
                attempts++;
                if (attempts > 20) clearInterval(interval);
            }, 50);
        });
    </script>
</body>`;
    contact = contact.replace(/<!-- Auto-select service script -->[\\s\\S]*?<\\/body >/, '<!-- Auto-select service script -->\\n    ' + newScript);
    fs.writeFileSync('contact.html', contact);
    console.log('Fixed contact form auto select logic');

} catch (err) {
    console.error(err);
}
