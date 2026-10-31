// Skeleton loading for every page.
// Include as the first script in <head>. While the page loads, the page's own
// layout is shown with its text, images and buttons drawn as pulsing blocks,
// so each page gets a skeleton that matches its design.
// Content areas that load data later (tables, grids) show skeleton bars in
// place of the old spinner icons, and any `.kh-sk-pending` element stays a
// skeleton until its content is replaced.
(function () {
    if (document.getElementById('kh-skeleton-style')) return;

    var MIN_SHOW = 300;   // avoid a flicker on fast loads
    var MAX_SHOW = 6000;  // never hide the page for longer than this
    var start = Date.now();
    var root = document.documentElement;

    // Leaf-level elements that become blocks; containers keep their layout
    // and their children become the blocks instead.
    var LEAVES = ':is(h1,h2,h3,h4,h5,h6,p,li,dt,dd,label,blockquote,figcaption,td,th,small,strong,em,b,span,a,button,.btn,input,textarea,select,i,img,svg,video,iframe,canvas)';
    var CONTAINERS = ':has(h1,h2,h3,h4,h5,h6,p,li,div,section,article,ul,ol,img,table,form,figure,header,nav,aside)';
    var BLOCK = 'color: transparent !important; -webkit-text-fill-color: transparent !important;' +
        'text-shadow: none !important; border-color: transparent !important; box-shadow: none !important;' +
        'background: var(--kh-sk-color) !important;' +
        'animation: kh-sk-pulse 1.1s ease-in-out infinite alternate !important;';
    // Plain text keeps a small radius; buttons, inputs and images keep their own shape.
    var TEXT = ':is(h1,h2,h3,h4,h5,h6,p,li,dt,dd,label,blockquote,figcaption,td,th,small,strong,em,b,span,i)';
    // Running text is drawn as one bar per line instead of a solid slab.
    var PARAGRAPHS = ':is(h1,h2,h3,h4,h5,h6,p,blockquote,figcaption)';
    var LINES = 'background: repeating-linear-gradient(to bottom, transparent 0 .22em,' +
        ' var(--kh-sk-color) .22em calc(1lh - .22em), transparent calc(1lh - .22em) 1lh) !important;';
    var P = 'html.kh-sk-loading body ';
    // Three skeleton bars drawn in the box that used to hold a spinner.
    var BARS = 'color: transparent !important; position: relative; min-height: 84px;' +
        'background-image: linear-gradient(var(--kh-sk-color), var(--kh-sk-color)),' +
        ' linear-gradient(var(--kh-sk-color), var(--kh-sk-color)),' +
        ' linear-gradient(var(--kh-sk-color), var(--kh-sk-color)) !important;' +
        'background-repeat: no-repeat !important;' +
        'background-size: 92% 12px, 76% 12px, 54% 12px !important;' +
        'background-position: 4% 22px, 4% 44px, 4% 66px !important;' +
        'animation: kh-sk-pulse 1.1s ease-in-out infinite alternate !important;';

    var css = '' +
        // Semi-transparent so the blocks read on both light and dark sections.
        ':root { --kh-sk-color: rgba(128, 138, 155, .22); }' +
        '@keyframes kh-sk-pulse { from { opacity: 1; } to { opacity: .55; } }' +
        '@keyframes kh-sk-fade { from { opacity: .6; } to { opacity: 1; } }' +
        // Page load skeleton
        'html.kh-sk-loading body { pointer-events: none; user-select: none; }' +
        'html.kh-sk-loading ' + LEAVES + ':not(' + CONTAINERS + ') {' + BLOCK + '}' +
        // Anything inside a block (icons in buttons, spans in text) merges into it.
        'html.kh-sk-loading ' + LEAVES + ':not(' + CONTAINERS + ') * { background: transparent !important; animation: none !important; }' +
        // :where() keeps this at zero specificity so a component's own radius wins.
        ':where(html.kh-sk-loading ' + TEXT + ':not(' + CONTAINERS + ')) { border-radius: 6px; }' +
        // :root raises specificity above the block rule above.
        'html.kh-sk-loading:root ' + PARAGRAPHS + ':not(' + CONTAINERS + ') {' + LINES + ' border-radius: 0; }' +
        // Home page: keep the hero, emblem and stats recognisable.
        P + '.kh-menu-btn { background: none !important; animation: none !important; }' +
        P + '.kh-menu-btn > span { background: var(--kh-sk-color) !important; border-radius: 2px;' +
        '  animation: kh-sk-pulse 1.1s ease-in-out infinite alternate !important; }' +
        P + '.kh-pill .kh-pill-arrow { background: var(--kh-sk-color) !important; }' +
        P + '.kh-emblem .kh-scales { visibility: hidden !important; }' +
        P + '.kh-emblem .kh-ring { background: none !important; border-radius: 50% !important;' +
        '  box-shadow: inset 0 0 0 clamp(24px, 4.5vw, 52px) var(--kh-sk-color) !important; }' +
        // Stats strips (home .kh-stats, About .ka-stats)
        P + ':is(.kh-stats .kh-stat, .ka-stats .ka-stat) { background: none !important; animation: none !important; }' +
        P + ':is(.kh-stats .kh-stat, .ka-stats .ka-stat) :is(.kh-stat-icon, .ka-icon, .kh-stat-num, .ka-stat-num, .kh-stat-label, .ka-stat-label) {' +
        '  background: var(--kh-sk-color) !important; animation: kh-sk-pulse 1.1s ease-in-out infinite alternate !important; }' +
        P + ':is(.kh-stats .kh-stat, .ka-stats .ka-stat) :is(.kh-stat-icon, .ka-icon) { border-radius: 50%; }' +
        P + ':is(.kh-stats .kh-stat, .ka-stats .ka-stat) :is(.kh-stat-num, .ka-stat-num, .kh-stat-label, .ka-stat-label) { border-radius: 6px; min-width: 64px; }' +
        P + ':is(.kh-stats .kh-stat, .ka-stats .ka-stat) :is(.kh-stat-num, .ka-stat-num) { margin-bottom: 6px; }' +
        'html.kh-sk-loading :is(input,textarea)::placeholder { color: transparent !important; }' +
        'html.kh-sk-loading img { object-position: -99999px 99999px !important; }' +
        'html.kh-sk-loading :is(svg *, video, iframe, canvas) { visibility: hidden !important; }' +
        'html.kh-sk-loading :is(i, svg)::before { visibility: hidden !important; }' +
        'html.kh-sk-loading :is(summary, .ka-faq-icon)::before, html.kh-sk-loading :is(summary, .ka-faq-icon)::after { visibility: hidden !important; }' +
        'html.kh-sk-reveal body { animation: kh-sk-fade .35s ease-out; }' +
        // No circle loaders anywhere: hide spinner icons ...
        '.fa-spinner, .fa-circle-notch { display: none !important; }' +
        // ... and draw skeleton bars where a spinner marked a loading area.
        ':is(td, div):has(> .fa-spinner), .kh-sk-pending {' + BARS + '}' +
        '.kh-sk-pending * { visibility: hidden !important; }' +
        // Placeholder blocks written into a page (e.g. blog cards while posts load).
        '.kh-sk-box { display: block; background: var(--kh-sk-color); border-radius: 6px;' +
        '  animation: kh-sk-pulse 1.1s ease-in-out infinite alternate; }' +
        '.kh-sk-line { height: 12px; margin-bottom: 12px; }' +
        '@media (prefers-reduced-motion: reduce) {' +
        '  html.kh-sk-loading *, :is(td, div):has(> .fa-spinner), .kh-sk-pending, .kh-sk-box { animation: none !important; }' +
        '}';

    var style = document.createElement('style');
    style.id = 'kh-skeleton-style';
    style.textContent = css;
    document.head.appendChild(style);

    // Only show the page skeleton on a fresh load: the first visit to a page in
    // this tab, or a refresh. Pages already opened, and back/forward, skip it.
    var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var navType = nav ? nav.type : '';
    var seen = {};
    try { seen = JSON.parse(sessionStorage.getItem('kh-sk-seen')) || {}; } catch (e) {}
    var page = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    var skip = navType === 'back_forward' || (navType !== 'reload' && seen[page]);
    seen[page] = 1;
    try { sessionStorage.setItem('kh-sk-seen', JSON.stringify(seen)); } catch (e) {}
    // Other scripts (js/kh-reveal.js) use this to play intro animations only on a fresh load.
    window.khFreshLoad = !skip;
    // CSS uses this for first-load-only effects (section snapping on the homepage).
    if (!skip) root.classList.add('kh-fresh');
    if (skip) { watchPendingWhenReady(); return; }

    root.classList.add('kh-sk-loading');
    window.khSkeletonActive = true;

    var done = false;
    function hide() {
        if (done) return;
        done = true;
        window.khSkeletonActive = false;
        // Lets js/kh-reveal.js set up its animations in the same frame, so they
        // start as the skeleton fades instead of playing underneath it.
        document.dispatchEvent(new Event('kh-skeleton-done'));
        root.classList.remove('kh-sk-loading');
        root.classList.add('kh-sk-reveal');
        setTimeout(function () { root.classList.remove('kh-sk-reveal'); }, 400);
    }

    function hideAfterMin() {
        setTimeout(hide, Math.max(0, MIN_SHOW - (Date.now() - start)));
    }

    if (document.readyState === 'complete') hideAfterMin();
    else window.addEventListener('load', hideAfterMin);
    setTimeout(hide, MAX_SHOW);

    // `.kh-sk-pending` placeholders clear themselves once scripts fill them in.
    function watchPending() {
        var els = document.querySelectorAll('.kh-sk-pending');
        Array.prototype.forEach.call(els, function (el) {
            var obs = new MutationObserver(function () {
                el.classList.remove('kh-sk-pending');
                obs.disconnect();
            });
            obs.observe(el, { childList: true, characterData: true, subtree: true });
        });
    }
    function watchPendingWhenReady() {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchPending);
        else watchPending();
    }
    watchPendingWhenReady();
})();
