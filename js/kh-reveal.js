// Homepage and the main inner pages (About, Practice areas, Team, Case results,
// Track case, Fee estimator, FAQ, Legal insights, Contact): content rises into place as each
// section scrolls into view. Selectors that aren't on a page are skipped.
(function () {
    // [selector, variant, stagger between siblings in ms, siblings per row]
    // The stagger counts siblings within the same parent; with a row size it
    // restarts on each row of a grid.
    var groups = [
        ['.kh-media .kh-section-head', 'up', 0],
        ['.kh-media .kh-video', 'left', 0],
        ['.kh-media .kh-post', 'up', 200],
        ['.kh-practice .kh-section-head', 'up', 0],
        ['.kh-practice .kh-card', 'up', 220],
        ['.kh-why .kh-why-photo', 'left', 0],
        ['.kh-why .kh-section-title, .kh-why .kh-section-sub', 'up', 160],
        ['.kh-why .kh-why-point', 'up', 160],
        ['.kh-why-content > .kh-pill', 'up', 0],
        ['.kh-news-panel', 'up', 0],
        ['.kh-cta-panel', 'up', 0],
        ['.kh-cta-content > *', 'up', 200],
        // About and Practice areas (css/kh-page.css)
        ['.ka-split:not(.ka-founder) .ka-photo', 'left', 0],
        ['.ka-founder .ka-photo', 'right', 0],
        ['.ka-split .ka-copy > *', 'up', 160],
        ['.ka-values .ka-h2, .ka-values .ka-faq-sub', 'up', 160],
        ['.ka-values .ka-card', 'up', 200],
        ['.ka-faq-item', 'up', 160],
        ['.ka-areas .ka-card', 'up', 200, 3],
        ['.ka-people .ka-h2, .ka-people .ka-sub', 'up', 160],
        ['.ka-people .ka-card', 'up', 200, 3],
        ['.cr-filter-bar', 'up', 0],
        ['.cr-card', 'up', 200, 3],
        ['.ka-cta', 'up', 0],
        ['.ka-cta > *', 'up', 200],
        ['.ka-track-head, .tracking-form', 'up', 160],
        ['.estimator-disclaimer', 'up', 0],
        ['.est-step', 'up', 0],
        ['.est-options-grid > *', 'up', 120, 3],
        ['.est-result', 'up', 0],
        ['.estimator-sidebar > *', 'up', 160],
        ['.ka-faq-nav', 'left', 0],
        ['.ka-faq-cat', 'up', 0],
        ['.ka-blog-head', 'up', 0],
        ['.blog-card', 'up', 200, 3],
        ['.ka-contact-info > :not(.ka-contact-list), .ka-contact-list > li', 'up', 160],
        ['.ka-form-card', 'right', 0],
        ['.ka-map', 'up', 0],
        ['.kh-footer-grid > *', 'up', 160]
    ];

    // Section-to-section snapping is for the first pass down the page. Once the
    // visitor scrolls back up or reaches the bottom, it switches off so the
    // rest of the visit scrolls freely. A fresh load brings it back.
    (function releaseSnap() {
        var root = document.documentElement;
        if (!root.classList.contains('kh-fresh')) return;
        // .kh-snap turns snapping on for About and Practice areas (css/kh-page.css).
        root.classList.add('kh-snap');
        function release() {
            root.classList.remove('kh-fresh', 'kh-snap');
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('scroll', onScroll);
        }
        // Only user intent counts; the snap itself can nudge the page upwards.
        function onWheel(e) { if (e.deltaY < 0 && window.scrollY > 100) release(); }
        function onKey(e) {
            if (['ArrowUp', 'PageUp', 'Home'].indexOf(e.key) !== -1 && window.scrollY > 100) release();
        }
        var touchY = 0;
        function onTouchStart(e) { touchY = e.touches[0].clientY; }
        function onTouchMove(e) { if (e.touches[0].clientY - touchY > 30 && window.scrollY > 100) release(); }
        function onScroll() {
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) release();
        }
        window.addEventListener('wheel', onWheel, { passive: true });
        window.addEventListener('keydown', onKey);
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
    })();

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Animations and counters play only the first time the page is opened
    // (see js/skeleton.js); revisits show everything in place straight away.
    if (reduce || !('IntersectionObserver' in window) || window.khFreshLoad === false) return;

    document.documentElement.classList.add('kh-js');

    function setup() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        groups.forEach(function (g) {
            var perParent = new Map();
            document.querySelectorAll(g[0]).forEach(function (el) {
                if (el.classList.contains('reveal-on-scroll')) return;
                var i = perParent.get(el.parentNode) || 0;
                perParent.set(el.parentNode, i + 1);
                el.setAttribute('data-reveal', g[1]);
                el.style.setProperty('--kh-delay', ((g[3] ? i % g[3] : i) * g[2]) + 'ms');
                observer.observe(el);
            });
        });
    }

    // Content is hidden for its reveal only once the skeleton goes, so the
    // skeleton still shows it and the reveal plays in view. .kh-reveal-init
    // makes the hiding instant instead of a fade out.
    function setupNow() {
        var root = document.documentElement;
        root.classList.add('kh-reveal-init');
        setup();
        void root.offsetHeight;
        root.classList.remove('kh-reveal-init');
    }
    document.addEventListener('DOMContentLoaded', function () {
        if (window.khSkeletonActive) document.addEventListener('kh-skeleton-done', setupNow, { once: true });
        else setupNow();
    });

    // Stats strip: numbers count up like on the case results page. The target
    // is read from the text ("20+", "98%") so CMS edits keep working.
    function animateCounter(el) {
        var match = el.textContent.match(/^(\D*)(\d+)(.*)$/);
        if (!match) return;
        var target = parseInt(match[2], 10);
        var current = 0;
        var step = target / 60;
        el.textContent = match[1] + '0' + match[3];
        var timer = setInterval(function () {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = match[1] + Math.floor(current) + match[3];
        }, 25);
    }

    // Start after load so the count isn't hidden behind the skeleton loader.
    window.addEventListener('load', function () {
        var counter = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                counter.unobserve(entry.target);
                setTimeout(function () { animateCounter(entry.target); }, 350);
            });
        }, { threshold: 0.5 });
        document.querySelectorAll('.kh-stat-num, .ka-stat-num:not(:has(.cr-stat-number)), .cr-stat-number').forEach(function (el) { counter.observe(el); });
    });
})();
