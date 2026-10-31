// Dashboard "Website Editor": edits the site_content documents read by js/cms.js.
// Field list and default values come from js/cms-registry.json (tools/cms-tag.js).
(function () {
    var root = document.getElementById('klEditor');
    if (!root) return;

    var registry = null;
    var current = null;      // { slug, isGlobal, def, doc, dirty }
    var DEFAULT_SETTINGS = null;

    var $ = function (sel, el) { return (el || root).querySelector(sel); };
    var esc = function (v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };
    var db = function () { return window.fbDb; };
    var toast = function (m) { if (window.showToast) window.showToast(m); };
    var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
    var stripKey = function (k) { return k.split(':')[1]; };
    var plain = function (html) { var d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };

    // ---------- layout ----------
    root.innerHTML =
        '<div class="ke">' +
        '  <aside class="ke-nav" aria-label="Pages">' +
        '    <label class="kh-sr-only" for="keSearch">Find a page</label>' +
        '    <input id="keSearch" class="ke-search" type="search" placeholder="Find a page">' +
        '    <div id="kePages" class="ke-pages"><p class="ke-muted">Loading pages…</p></div>' +
        '  </aside>' +
        '  <section class="ke-main" aria-live="polite">' +
        '    <div class="ke-bar">' +
        '      <div><h2 id="keTitle" class="ke-title">Choose a page</h2><p id="keSub" class="ke-muted">Pick a page on the left to edit its content.</p></div>' +
        '      <div class="ke-bar-actions">' +
        '        <a id="keView" class="btn-outline ke-btn" href="index.html" target="_blank" rel="noopener" hidden><i class="fa-solid fa-arrow-up-right-from-square"></i> View page</a>' +
        '        <button id="keSave" type="button" class="btn-primary ke-btn" disabled><i class="fa-solid fa-floppy-disk"></i> Save changes</button>' +
        '      </div>' +
        '    </div>' +
        '    <div id="keBody" class="ke-body"></div>' +
        '  </section>' +
        '</div>';

    var pagesBox = $('#kePages'), body = $('#keBody'), saveBtn = $('#keSave');

    function setDirty(on) {
        if (!current) return;
        current.dirty = on;
        saveBtn.disabled = !on;
        saveBtn.innerHTML = on ? '<i class="fa-solid fa-floppy-disk"></i> Save changes' : '<i class="fa-solid fa-check"></i> Saved';
    }

    window.addEventListener('beforeunload', function (e) {
        if (current && current.dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    // ---------- page list ----------
    function renderPages(filter) {
        var f = (filter || '').toLowerCase();
        var html = '<p class="ke-group">Site-wide</p>';
        html += pageBtn('__global', 'Firm details, menu & footer', 'fa-globe');
        html += '<p class="ke-group">Pages</p>';
        // Numeric-looking keys (404) sort first in JS objects; keep that page last
        Object.keys(registry.pages).sort(function (a, b) { return (a === '404') - (b === '404'); }).forEach(function (slug) {
            var t = registry.pages[slug].title;
            if (f && t.toLowerCase().indexOf(f) < 0) return;
            html += pageBtn(slug, t, 'fa-file-lines');
        });
        pagesBox.innerHTML = html;
    }

    function pageBtn(slug, title, icon) {
        var on = current && current.slug === slug ? ' is-active' : '';
        return '<button type="button" class="ke-page' + on + '" data-slug="' + slug + '"><i class="fa-solid ' + icon + '"></i><span>' + esc(title) + '</span></button>';
    }

    pagesBox.addEventListener('click', function (e) {
        var b = e.target.closest('.ke-page');
        if (!b) return;
        if (current && current.dirty && !confirm('You have unsaved changes on this page. Leave without saving?')) return;
        openPage(b.getAttribute('data-slug'));
    });

    $('#keSearch').addEventListener('input', function (e) { renderPages(e.target.value); });

    // ---------- open a page ----------
    function openPage(slug) {
        var isGlobal = slug === '__global';
        var def = isGlobal ? registry.global : registry.pages[slug];
        var docId = isGlobal ? 'global' : slug;
        current = { slug: slug, isGlobal: isGlobal, def: def, docId: docId, doc: {}, dirty: false };
        renderPages($('#keSearch').value);
        $('#keTitle').textContent = isGlobal ? 'Firm details, menu & footer' : def.title;
        $('#keSub').textContent = isGlobal ? 'Shown on every page: contact details, the menu and the footer.' : 'Edit the text, links, images and lists on this page.';
        var view = $('#keView');
        view.hidden = false;
        view.href = isGlobal ? 'index.html' : slug + '.html';
        body.innerHTML = '<div class="ke-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading content…</div>';
        setDirty(false);
        saveBtn.disabled = true;
        db().collection('site_content').doc(docId).get().then(function (snap) {
            current.doc = snap.exists ? snap.data() : {};
            renderEditor();
        }).catch(function (err) {
            body.innerHTML = '<div class="ke-error">Could not load this page’s content (' + esc(err.message || err) + ').</div>';
        });
    }

    // ---------- editor ----------
    function renderEditor() {
        var def = current.def, doc = current.doc;
        var fields = doc.fields || {}, lists = doc.lists || {};
        var html = '';

        if (current.isGlobal) {
            var s = Object.assign({}, DEFAULT_SETTINGS, doc.settings || {});
            html += card('Firm details', 'fa-address-card', true,
                '<p class="ke-help">Changing these updates every place they appear on the website, including links.</p>' +
                setting('phone', 'Phone number', s.phone, 'e.g. +250 790 750 000') +
                setting('email', 'Email address', s.email, 'e.g. info@kaltolaw.com') +
                setting('whatsapp', 'WhatsApp number (digits only)', s.whatsapp, 'e.g. 250790750000') +
                setting('youtube', 'Homepage YouTube video (link or ID)', s.youtube, 'e.g. https://www.youtube.com/watch?v=…') +
                setting('social.X', 'X (Twitter) profile link', (s.social || {}).X || '', 'https://x.com/…') +
                setting('social.LinkedIn', 'LinkedIn profile link', (s.social || {}).LinkedIn || '', 'https://www.linkedin.com/…'));
        } else {
            var m = Object.assign({}, def.meta, doc.meta || {});
            html += card('Search engines & browser tab', 'fa-magnifying-glass', false,
                metaField('title', 'Page title (browser tab)', m.title, def.meta.title) +
                metaField('description', 'Description (search results)', m.description, def.meta.description, true));
        }

        Object.keys(def.sections).forEach(function (name) {
            var sec = def.sections[name];
            var inner = '';
            sec.fields.forEach(function (f) { inner += fieldHtml(f, fields[stripKey(f.key)]); });
            sec.lists.forEach(function (l) { inner += listHtml(l, lists[stripKey(l.key)]); });
            if (inner) html += card(name === 'Main' ? 'Main menu' : name, 'fa-layer-group', !current.isGlobal && Object.keys(def.sections)[0] === name, inner);
        });

        body.innerHTML = html;
        body.querySelectorAll('textarea').forEach(autoGrow);
    }

    function card(title, icon, open, inner) {
        return '<details class="ke-card"' + (open ? ' open' : '') + '><summary><i class="fa-solid ' + icon + '"></i><span>' + esc(title) + '</span><i class="fa-solid fa-chevron-down ke-chev"></i></summary><div class="ke-card-body">' + inner + '</div></details>';
    }

    function setting(name, label, value, ph) {
        return '<label class="ke-field"><span class="ke-label">' + esc(label) + '</span><input class="ke-input" data-setting="' + name + '" value="' + esc(value) + '" placeholder="' + esc(ph) + '"></label>';
    }

    function metaField(name, label, value, def, long) {
        var input = long
            ? '<textarea class="ke-input" data-meta="' + name + '" rows="2">' + esc(value) + '</textarea>'
            : '<input class="ke-input" data-meta="' + name + '" value="' + esc(value) + '">';
        return '<label class="ke-field"><span class="ke-label">' + esc(label) + '</span>' + input + '</label>';
    }

    function isChanged(def, saved) {
        return saved !== undefined && JSON.stringify(saved) !== JSON.stringify(def);
    }

    // Single field
    function fieldHtml(f, saved) {
        var key = stripKey(f.key);
        var changed = saved !== undefined;
        var head = '<div class="ke-field-head"><span class="ke-label">' + esc(f.label) + '</span>' +
            (changed ? '<span class="ke-changed">Edited</span><button type="button" class="ke-reset" data-reset="' + key + '">Reset to original</button>' : '') + '</div>';
        if (f.type === 'img') {
            var v = saved || f.value;
            return '<div class="ke-field" data-field="' + key + '" data-type="img">' + head + imgInputs(v) + '</div>';
        }
        if (f.type === 'href') {
            return '<div class="ke-field" data-field="' + key + '" data-type="href">' + head +
                '<input class="ke-input" data-part="href" value="' + esc(saved != null ? saved : f.value) + '" placeholder="Link address">' +
                (f.hint ? '<span class="ke-hint">' + esc(f.hint) + '</span>' : '') + '</div>';
        }
        var text = saved != null ? (typeof saved === 'object' ? saved.text : saved) : f.value;
        var href = saved && typeof saved === 'object' && saved.href ? saved.href : f.href;
        return '<div class="ke-field" data-field="' + key + '" data-type="text" data-mode="' + (f.mode || 'html') + '">' + head +
            textInput(text, f.mode) +
            (f.mode === 'html' && /<\w/.test(text || '') ? '<span class="ke-hint">Keep tags like &lt;strong&gt;…&lt;/strong&gt; for bold text.</span>' : '') +
            (f.href != null ? '<input class="ke-input ke-link" data-part="href" value="' + esc(href) + '" placeholder="Link address">' : '') + '</div>';
    }

    function textInput(value, mode) {
        var long = (value || '').length > 70 || mode === 'html' && /<\w/.test(value || '');
        return long || (value || '').length > 40
            ? '<textarea class="ke-input" data-part="text" rows="2">' + esc(value) + '</textarea>'
            : '<input class="ke-input" data-part="text" value="' + esc(value) + '">';
    }

    function imgInputs(v) {
        v = typeof v === 'string' ? { src: v, alt: '' } : (v || { src: '', alt: '' });
        return '<div class="ke-img">' +
            '<img class="ke-thumb" src="' + esc(v.src) + '" alt="">' +
            '<div class="ke-img-inputs">' +
            '<input class="ke-input" data-part="src" value="' + esc(v.src) + '" placeholder="Image address">' +
            '<input class="ke-input" data-part="alt" value="' + esc(v.alt) + '" placeholder="Describe the image (for screen readers)">' +
            '<label class="btn-outline ke-btn ke-upload"><i class="fa-solid fa-cloud-arrow-up"></i> Upload image<input type="file" accept="image/*" hidden></label>' +
            '</div></div>';
    }

    // Repeatable list
    function listHtml(l, saved) {
        var key = stripKey(l.key);
        var items = saved || l.items;
        var edited = saved !== undefined;
        var html = '<div class="ke-list" data-list="' + key + '">' +
            '<div class="ke-field-head"><span class="ke-label">List · ' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span>' +
            (edited ? '<span class="ke-changed">Edited</span><button type="button" class="ke-reset" data-reset-list="' + key + '">Reset to original</button>' : '') + '</div>';
        items.forEach(function (item, i) { html += itemHtml(l, item, i, items.length); });
        html += '<button type="button" class="ke-add" data-add="' + key + '"><i class="fa-solid fa-plus"></i> Add item</button></div>';
        return html;
    }

    function itemHtml(l, item, i, count) {
        var firstText = '';
        l.schema.forEach(function (s) { if (!firstText && s.type === 'text') firstText = plain(item[s.name]); });
        var html = '<details class="ke-item" data-index="' + i + '"><summary><span class="ke-item-n">' + (i + 1) + '</span><span class="ke-item-t">' + esc(firstText || 'Item ' + (i + 1)) + '</span>' +
            '<span class="ke-item-actions">' +
            '<button type="button" data-move="-1" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-up"></i></button>' +
            '<button type="button" data-move="1" aria-label="Move down"' + (i === count - 1 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-down"></i></button>' +
            '<button type="button" data-remove aria-label="Remove item"><i class="fa-solid fa-trash"></i></button>' +
            '</span></summary><div class="ke-item-body">';
        l.schema.forEach(function (s) {
            var v = item[s.name];
            html += '<div class="ke-field" data-f="' + s.name + '" data-type="' + s.type + '">';
            html += '<span class="ke-label">' + esc(s.tags ? 'Tags (comma separated)' : s.label) + '</span>';
            if (s.type === 'img') html += imgInputs(v);
            else if (s.type === 'href') html += '<input class="ke-input" data-part="href" value="' + esc(v) + '" placeholder="Link address">';
            else if (s.type === 'attr') html += '<input class="ke-input" data-part="text" value="' + esc(v) + '">';
            else {
                var val = s.tags ? plainTags(v) : v;
                html += textInput(val, s.mode);
                if (s.link) html += '<input class="ke-input ke-link" data-part="href" value="' + esc(item[s.name + '@href'] || '') + '" placeholder="Link address">';
            }
            html += '</div>';
        });
        return html + '</div></details>';
    }

    function plainTags(v) {
        if (!v) return '';
        if (!/<span/.test(v)) return v;
        var d = document.createElement('div'); d.innerHTML = v;
        return [].map.call(d.querySelectorAll('span'), function (s) { return s.textContent.trim(); }).join(', ');
    }

    function autoGrow(t) {
        t.style.height = 'auto';
        t.style.height = Math.min(t.scrollHeight + 2, 420) + 'px';
    }

    // ---------- reading the form ----------
    function readItem(el, l) {
        var out = {};
        l.schema.forEach(function (s) {
            var f = el.querySelector('[data-f="' + s.name + '"]');
            if (!f) return;
            if (s.type === 'img') out[s.name] = { src: f.querySelector('[data-part="src"]').value.trim(), alt: f.querySelector('[data-part="alt"]').value.trim() };
            else if (s.type === 'href') out[s.name] = f.querySelector('[data-part="href"]').value.trim();
            else {
                out[s.name] = f.querySelector('[data-part="text"]').value.trim();
                var h = f.querySelector('[data-part="href"]');
                if (h) out[s.name + '@href'] = h.value.trim();
            }
        });
        return out;
    }

    function findList(key) {
        var found = null;
        Object.keys(current.def.sections).forEach(function (n) {
            current.def.sections[n].lists.forEach(function (l) { if (stripKey(l.key) === key) found = l; });
        });
        return found;
    }

    function findField(key) {
        var found = null;
        Object.keys(current.def.sections).forEach(function (n) {
            current.def.sections[n].fields.forEach(function (f) { if (stripKey(f.key) === key) found = f; });
        });
        return found;
    }

    function readList(box) {
        var l = findList(box.getAttribute('data-list'));
        return [].map.call(box.querySelectorAll(':scope > .ke-item'), function (el) { return readItem(el, l); });
    }

    function collect() {
        var out = { fields: {}, lists: {} };
        body.querySelectorAll('.ke-field[data-field]').forEach(function (el) {
            var key = el.getAttribute('data-field');
            var f = findField(key);
            var type = el.getAttribute('data-type');
            var value;
            if (type === 'img') {
                value = { src: el.querySelector('[data-part="src"]').value.trim(), alt: el.querySelector('[data-part="alt"]').value.trim() };
                if (JSON.stringify(value) === JSON.stringify(f.value)) return;
            } else if (type === 'href') {
                value = el.querySelector('[data-part="href"]').value.trim();
                if (value === f.value) return;
            } else {
                var text = el.querySelector('[data-part="text"]').value.trim();
                var h = el.querySelector('[data-part="href"]');
                var href = h ? h.value.trim() : null;
                var textSame = text === String(f.value).trim();
                var hrefSame = !h || href === f.href;
                if (textSame && hrefSame) return;
                value = h && !hrefSame ? { text: text, href: href } : text;
            }
            out.fields[key] = value;
        });
        body.querySelectorAll('.ke-list').forEach(function (box) {
            var key = box.getAttribute('data-list');
            var l = findList(key);
            var items = readList(box);
            if (JSON.stringify(items) !== JSON.stringify(normalizeDefault(l))) out.lists[key] = items;
        });
        if (current.isGlobal) {
            var s = { social: {} };
            body.querySelectorAll('[data-setting]').forEach(function (i) {
                var n = i.getAttribute('data-setting'), v = i.value.trim();
                if (n === 'youtube') v = youtubeId(v);
                if (n.indexOf('social.') === 0) s.social[n.slice(7)] = v; else s[n] = v;
            });
            out.settings = s;
        } else {
            out.meta = {};
            body.querySelectorAll('[data-meta]').forEach(function (i) {
                var n = i.getAttribute('data-meta');
                if (i.value.trim() !== (current.def.meta[n] || '')) out.meta[n] = i.value.trim();
            });
        }
        return out;
    }

    // Defaults in the same shape the form produces (tags as "a, b")
    function normalizeDefault(l) {
        return l.items.map(function (item) {
            var o = {};
            l.schema.forEach(function (s) {
                var v = item[s.name];
                if (s.type === 'img') o[s.name] = { src: (v || {}).src || '', alt: (v || {}).alt || '' };
                else if (s.type === 'href') o[s.name] = v || '';
                else {
                    o[s.name] = String(s.tags ? plainTags(v) : (v == null ? '' : v)).trim();
                    if (s.link) o[s.name + '@href'] = item[s.name + '@href'] || '';
                }
            });
            return o;
        });
    }

    function youtubeId(v) {
        var m = String(v || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
        return m ? m[1] : String(v || '').trim();
    }

    // ---------- interactions ----------
    body.addEventListener('input', function (e) {
        if (e.target.matches('textarea')) autoGrow(e.target);
        if (e.target.matches('[data-part="src"]')) {
            var thumb = e.target.closest('.ke-img').querySelector('.ke-thumb');
            thumb.src = e.target.value;
        }
        setDirty(true);
    });

    body.addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        if (t.closest('summary')) e.preventDefault();

        if (t.hasAttribute('data-reset')) {
            var key = t.getAttribute('data-reset');
            delete (current.doc.fields || {})[key];
            var f = findField(key);
            var el = t.closest('.ke-field');
            el.outerHTML = fieldHtml(f, undefined);
            setDirty(true);
            return;
        }
        if (t.hasAttribute('data-reset-list')) {
            var lk = t.getAttribute('data-reset-list');
            var box = t.closest('.ke-list');
            box.outerHTML = listHtml(findList(lk), undefined);
            setDirty(true);
            return;
        }
        var listBox = t.closest('.ke-list');
        if (!listBox) return;
        var l = findList(listBox.getAttribute('data-list'));
        var items = readList(listBox);
        if (t.hasAttribute('data-add')) {
            var copy = clone(items[items.length - 1] || normalizeDefault(l)[0]);
            items.push(copy);
            rerenderList(listBox, l, items, items.length - 1);
        } else if (t.hasAttribute('data-remove')) {
            var i = +t.closest('.ke-item').getAttribute('data-index');
            if (items.length === 1) { toast('A list needs at least one item.'); return; }
            if (!confirm('Remove this item?')) return;
            items.splice(i, 1);
            rerenderList(listBox, l, items);
        } else if (t.hasAttribute('data-move')) {
            var j = +t.closest('.ke-item').getAttribute('data-index');
            var k = j + (+t.getAttribute('data-move'));
            if (k < 0 || k >= items.length) return;
            var tmp = items[j]; items[j] = items[k]; items[k] = tmp;
            rerenderList(listBox, l, items, k);
        }
    });

    function rerenderList(box, l, items, openIndex) {
        var wrap = document.createElement('div');
        wrap.innerHTML = listHtml(l, items);
        var fresh = wrap.firstChild;
        box.replaceWith(fresh);
        if (openIndex != null) {
            var it = fresh.querySelector('.ke-item[data-index="' + openIndex + '"]');
            if (it) { it.open = true; it.scrollIntoView({ block: 'nearest' }); }
        }
        fresh.querySelectorAll('textarea').forEach(autoGrow);
        setDirty(true);
    }

    // Image upload to Firebase Storage (public/site/…), readable by everyone
    body.addEventListener('change', function (e) {
        if (!e.target.matches('.ke-upload input[type="file"]')) return;
        var file = e.target.files[0];
        if (!file) return;
        if (!window.fbStorage) { toast('Image upload is not available.'); return; }
        var box = e.target.closest('.ke-img');
        var label = e.target.closest('.ke-upload');
        var name = 'public/site/' + Date.now() + '-' + file.name.replace(/[^\w.-]+/g, '-');
        label.classList.add('is-busy');
        window.fbStorage.ref(name).put(file).then(function (snap) {
            return snap.ref.getDownloadURL();
        }).then(function (url) {
            box.querySelector('[data-part="src"]').value = url;
            box.querySelector('.ke-thumb').src = url;
            setDirty(true);
            toast('Image uploaded. Save to publish it.');
        }).catch(function (err) {
            toast('Upload failed: ' + (err.message || err));
        }).then(function () { label.classList.remove('is-busy'); e.target.value = ''; });
    });

    // ---------- save ----------
    saveBtn.addEventListener('click', function () {
        if (!current) return;
        var data = collect();
        var user = window.fbAuth && window.fbAuth.currentUser;
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        data.updatedBy = user && user.email || 'admin';
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
        db().collection('site_content').doc(current.docId).set(data).then(function () {
            current.doc = data;
            setDirty(false);
            renderEditor();
            toast('Saved. The website now shows your changes.');
        }).catch(function (err) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save changes';
            toast('Could not save: ' + (err.message || err));
        });
    });

    // ---------- start ----------
    fetch('js/cms-registry.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (reg) {
        registry = reg;
        DEFAULT_SETTINGS = Object.assign({ social: {} }, reg.settings);
        renderPages('');
    }).catch(function () {
        pagesBox.innerHTML = '<p class="ke-error">Could not load the list of pages.</p>';
    });
})();
