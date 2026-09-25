// Menu dropdown for the site header (.kh-header)
document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.kh-menu-btn');
    var menu = document.getElementById('kh-menu');
    if (!btn || !menu) return;

    function setOpen(open) {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    btn.addEventListener('click', function () { setOpen(menu.hidden); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
        if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
    });
});
