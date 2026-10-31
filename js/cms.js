// Website content from the dashboard (Firestore collection "site_content").
//
// One document per page (id = page slug) plus "global" for the header, footer and
// firm details. Documents only hold what an editor changed; everything else keeps
// the HTML text. Elements are tagged by tools/cms-tag.js:
//   data-cms="p:<key>" / "g:<key>"   single field (page / site-wide)
//   data-cms-list="p:<key>"          repeatable list; its items' fields: data-cms-f
(function () {
    var CONFIG = {
        apiKey: 'AIzaSyC-dBhS8buRdeDHtfEqKAfz_G6LEgpDSa8',
        authDomain: 'kalto-law.firebaseapp.com',
        projectId: 'kalto-law',
        storageBucket: 'kalto-law.firebasestorage.app',
        messagingSenderId: '596851588699',
        appId: '1:596851588699:web:71089a814478b55532097e'
    };
    var SDK = 'https://www.gstatic.com/firebasejs/9.22.1/';
    var DEFAULTS = { phone: '+250 790 750 000', email: 'info.blaw223@yahoo.com', whatsapp: '250790750000' };

    function slug() {
        var p = location.pathname.replace(/\/+$/, '').split('/').pop() || 'index';
        return p.replace(/\.html$/, '') || 'index';
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]') && window.firebase) return resolve();
            var s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function getDb() {
        var ready = window.firebase && firebase.firestore
            ? Promise.resolve()
            : loadScript(SDK + 'firebase-app-compat.js').then(function () { return loadScript(SDK + 'firebase-firestore-compat.js'); });
        return ready.then(function () {
            if (!firebase.apps.length) firebase.initializeApp(CONFIG);
            return firebase.firestore();
        });
    }

    // ---------- applying values ----------
    function setText(el, value, mode) {
        if (mode === 'text' || el.querySelector('i[class*="fa-"], svg, .kh-pill-arrow')) {
            var first = true;
            [].slice.call(el.childNodes).forEach(function (n) {
                if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
                if (first) { n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, value); first = false; }
                else n.nodeValue = ' ';
            });
            if (first) el.appendChild(document.createTextNode(' ' + value));
        } else {
            el.innerHTML = value;
        }
        if (el.hasAttribute('data-count')) {
            var n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
            if (!isNaN(n)) el.setAttribute('data-count', n);
        }
    }

    function setImg(el, v) {
        if (!v) return;
        if (typeof v === 'string') v = { src: v };
        if (v.src) el.setAttribute('src', v.src);
        if (v.alt != null) el.setAttribute('alt', v.alt);
    }

    function applyValue(el, v) {
        if (v == null) return;
        if (el.tagName === 'IMG') return setImg(el, v);
        if (typeof v === 'object') {
            if (v.text != null) setText(el, v.text);
            if (v.href && el.tagName === 'A') el.setAttribute('href', v.href);
            return;
        }
        if (el.tagName === 'A' && !el.textContent.trim()) { el.setAttribute('href', v); return; }
        setText(el, v);
    }

    function applyFields(scope, prefix, fields) {
        if (!fields) return;
        scope.querySelectorAll('[data-cms^="' + prefix + ':"]').forEach(function (el) {
            var key = el.getAttribute('data-cms').slice(prefix.length + 1);
            if (Object.prototype.hasOwnProperty.call(fields, key)) applyValue(el, fields[key]);
        });
    }

    function fillItem(item, data) {
        item.querySelectorAll('[data-cms-f]').forEach(function (el) {
            var name = el.getAttribute('data-cms-f');
            if (!Object.prototype.hasOwnProperty.call(data, name)) return;
            var v = data[name];
            if (el.tagName === 'IMG') setImg(el, v);
            else if (el.tagName === 'A' && !el.textContent.trim()) el.setAttribute('href', v);
            else if (el.classList.contains('cr-tag-row')) {
                el.innerHTML = '';
                String(v).split(',').map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) {
                    var s = document.createElement('span'); s.className = 'cr-tag'; s.textContent = t; el.appendChild(s);
                });
            } else setText(el, v);
            if (el.tagName === 'A' && data[name + '@href']) el.setAttribute('href', data[name + '@href']);
        });
        Object.keys(data).forEach(function (k) {
            if (k.charAt(0) === '@') item.setAttribute(k.slice(1), data[k]);
        });
        // Cloned items must be visible (reveal-on-scroll animations)
        [item].concat([].slice.call(item.querySelectorAll('[data-reveal], .reveal-on-scroll'))).forEach(function (n) {
            if (n.hasAttribute('data-reveal')) n.classList.add('is-in');
            if (n.classList.contains('reveal-on-scroll')) n.classList.add('active');
        });
    }

    function applyLists(prefix, lists) {
        if (!lists) return;
        document.querySelectorAll('[data-cms-list^="' + prefix + ':"]').forEach(function (box) {
            var key = box.getAttribute('data-cms-list').slice(prefix.length + 1);
            var items = lists[key];
            if (!Array.isArray(items)) return;
            var existing = [].slice.call(box.children).filter(function (c) { return c.querySelector('[data-cms-f]') || c.hasAttribute('data-cms-f'); });
            var template = existing[0];
            if (!template) return;
            var tail = [].slice.call(box.children).filter(function (c) { return existing.indexOf(c) < 0; });
            var blank = template.cloneNode(true);
            items.forEach(function (data, i) {
                // Reuse existing nodes where possible so page scripts keep their listeners
                var node = existing[i] || blank.cloneNode(true);
                fillItem(node, data || {});
                box.appendChild(node);
            });
            existing.slice(items.length).forEach(function (n) { n.remove(); });
            tail.forEach(function (n) { box.appendChild(n); });
        });
    }

    function replaceEverywhere(from, to) {
        if (!from || !to || from === to) return;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue.indexOf(from) > -1) n.nodeValue = n.nodeValue.split(from).join(to);
        }
    }

    function applySettings(s) {
        if (!s) return;
        if (s.phone && s.phone !== DEFAULTS.phone) {
            replaceEverywhere(DEFAULTS.phone, s.phone);
            var tel = 'tel:' + s.phone.replace(/[^+\d]/g, '');
            document.querySelectorAll('a[href^="tel:"]').forEach(function (a) { a.setAttribute('href', tel); });
        }
        if (s.email && s.email !== DEFAULTS.email) {
            replaceEverywhere(DEFAULTS.email, s.email);
            document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) { a.setAttribute('href', 'mailto:' + s.email); });
        }
        if (s.whatsapp && s.whatsapp !== DEFAULTS.whatsapp) {
            document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) { a.setAttribute('href', 'https://wa.me/' + s.whatsapp.replace(/\D/g, '')); });
        }
        if (s.youtube) {
            var v = document.querySelector('.kh-video');
            if (v) {
                v.setAttribute('data-video', s.youtube);
                var poster = v.querySelector('.kh-video-poster');
                if (poster) poster.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(s.youtube) + '/hqdefault.jpg';
            }
        }
        if (s.social) {
            Object.keys(s.social).forEach(function (net) {
                var a = document.querySelector('.kh-footer-social a[aria-label*="' + net + '"]');
                if (a && s.social[net]) a.setAttribute('href', s.social[net]);
            });
        }
    }

    function applyMeta(meta) {
        if (!meta) return;
        if (meta.title) document.title = meta.title;
        if (meta.description) {
            var m = document.querySelector('meta[name="description"]');
            if (m) m.setAttribute('content', meta.description);
        }
    }

    // The menu is one list for every page; mark the current page again after a rebuild
    function markCurrentMenuItem() {
        var here = slug() + '.html';
        document.querySelectorAll('#kh-menu a').forEach(function (a) {
            var target = (a.getAttribute('href') || '').split('?')[0];
            if (target === here || (here === 'index.html' && target === 'index.html')) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
    }

    function apply(page, global) {
        global = global || {};
        page = page || {};
        applyLists('g', global.lists);
        applyLists('p', page.lists);
        applyFields(document, 'g', global.fields);
        applyFields(document, 'p', page.fields);
        applySettings(global.settings);
        applyMeta(page.meta);
        markCurrentMenuItem();
        document.dispatchEvent(new CustomEvent('cms:applied'));
    }

    // Older edits made with the previous editor (website_content/<id>)
    function legacy(db, page) {
        var els = document.querySelectorAll('[data-cms-id]');
        return Promise.all([].map.call(els, function (el) {
            var key = (el.getAttribute('data-cms') || '').split(':')[1];
            if (page.fields && key && Object.prototype.hasOwnProperty.call(page.fields, key)) return null;
            return db.collection('website_content').doc(el.getAttribute('data-cms-id')).get().then(function (snap) {
                if (snap.exists && snap.data().content) el.innerHTML = snap.data().content;
            }).catch(function () {});
        }));
    }

    function run() {
        if (!document.querySelector('[data-cms], [data-cms-list]')) return;
        getDb().then(function (db) {
            var col = db.collection('site_content');
            return Promise.all([col.doc(slug()).get(), col.doc('global').get()]).then(function (r) {
                var page = r[0].exists ? r[0].data() : {};
                var global = r[1].exists ? r[1].data() : {};
                apply(page, global);
                return legacy(db, page);
            });
        }).catch(function (e) { console.warn('Website content could not be loaded; showing defaults.', e); });
    }

    window.KaltoCMS = { apply: apply, slug: slug };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
