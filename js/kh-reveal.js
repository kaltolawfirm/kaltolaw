// Homepage: content rises into place as each section scrolls into view.
(function () {
    // [selector, variant, stagger between siblings in ms]
    var groups = [
        ['.kh-media .kh-section-head', 'up', 0],
        ['.kh-media .kh-video', 'left', 0],
        ['.kh-media .kh-post', 'up', 110],
        ['.kh-practice .kh-section-head', 'up', 0],
        ['.kh-practice .kh-card', 'up', 120],
        ['.kh-why .kh-why-photo', 'left', 0],
        ['.kh-why .kh-section-title, .kh-why .kh-section-sub', 'up', 90],
        ['.kh-why .kh-why-point', 'up', 90],
        ['.kh-why-content > .kh-pill', 'up', 0],
        ['.kh-news-panel', 'up', 0],
        ['.kh-cta-panel', 'up', 0],
        ['.kh-cta-content > *', 'up', 110],
        ['.kh-footer-grid > *', 'up', 90]
    ];

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('kh-js');

    document.addEventListener('DOMContentLoaded', function () {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        groups.forEach(function (g) {
            document.querySelectorAll(g[0]).forEach(function (el, i) {
                if (el.classList.contains('reveal-on-scroll')) return;
                el.setAttribute('data-reveal', g[1]);
                el.style.setProperty('--kh-delay', (i * g[2]) + 'ms');
                observer.observe(el);
            });
        });
    });
})();
