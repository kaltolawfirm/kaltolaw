// Article editor for Legal Insights (dashboard > Legal Insights > Write).
// Turns the #postContent textarea into a formatted editor and keeps the
// textarea's value as the article HTML, which js/admin.js saves and
// blog-post.html shows (.post-body styles headings, lists and quotes).
//   window.KhRich.set(html)  load an article (plain text becomes paragraphs)
//   window.KhRich.get()      clean HTML for saving
(function () {
    var textarea = document.getElementById('postContent');
    if (!textarea) return;

    // Tags an article may use; anything else is unwrapped to its text
    var ALLOWED = { P: 1, H2: 1, H3: 1, STRONG: 1, EM: 1, U: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, BR: 1 };
    var RENAME = { B: 'STRONG', I: 'EM', H1: 'H2', H4: 'H3', H5: 'H3', H6: 'H3', DIV: 'P' };
    var DROP = { SCRIPT: 1, STYLE: 1, META: 1, LINK: 1, TITLE: 1, IFRAME: 1, OBJECT: 1, svg: 1, SVG: 1 };

    var esc = function (s) {
        return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    };

    // Plain text (older posts, or typed without the editor): blank lines make paragraphs
    function fromPlainText(text) {
        return String(text || '').split(/\n\s*\n/).map(function (block) {
            block = block.trim();
            return block ? '<p>' + esc(block).replace(/\n/g, '<br>') + '</p>' : '';
        }).join('');
    }
    var looksLikeHtml = function (s) { return /<(p|h[1-6]|ul|ol|li|br|div|strong|em|b|i|blockquote|a)\b/i.test(s || ''); };

    function clean(html) {
        var doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
        (function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (child) {
                if (child.nodeType === 8) { child.remove(); return; }
                if (child.nodeType !== 1) return;
                var tag = child.tagName.toUpperCase();
                if (DROP[tag]) { child.remove(); return; }
                walk(child);
                if (RENAME[tag]) {
                    var renamed = doc.createElement(RENAME[tag]);
                    while (child.firstChild) renamed.appendChild(child.firstChild);
                    child.replaceWith(renamed);
                    child = renamed;
                    tag = renamed.tagName;
                }
                if (!ALLOWED[tag]) {
                    // Unwrap (keep the text, drop the element)
                    while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
                    child.remove();
                    return;
                }
                // Strip every attribute except a safe link target
                var href = tag === 'A' ? (child.getAttribute('href') || '').trim() : '';
                Array.prototype.slice.call(child.attributes).forEach(function (a) { child.removeAttribute(a.name); });
                if (tag === 'A') {
                    if (/^(https?:|mailto:|tel:|\/|#|[\w-]+\.html)/i.test(href)) {
                        child.setAttribute('href', href);
                        if (/^https?:/i.test(href)) { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener'); }
                    } else {
                        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
                        child.remove();
                    }
                }
            });
        })(doc.body);
        // Loose text and inline runs at the top level go into paragraphs
        var out = doc.createElement('div'), para = null;
        Array.prototype.slice.call(doc.body.childNodes).forEach(function (n) {
            var block = n.nodeType === 1 && /^(P|H2|H3|UL|OL|BLOCKQUOTE)$/.test(n.tagName);
            if (block) { para = null; out.appendChild(n); return; }
            if (n.nodeType === 3 && !n.textContent.trim() && !para) return;
            if (!para) { para = doc.createElement('p'); out.appendChild(para); }
            para.appendChild(n);
        });
        // Remove empty paragraphs left by editing
        Array.prototype.slice.call(out.querySelectorAll('p, h2, h3, li, blockquote')).forEach(function (el) {
            if (!el.textContent.trim() && !el.querySelector('br')) el.remove();
        });
        return out.innerHTML.replace(/<p><br><\/p>/g, '').trim();
    }

    // ── Markup ──
    var wrap = document.createElement('div');
    wrap.className = 'kr';
    wrap.innerHTML =
        '<div class="kr-bar" role="toolbar" aria-label="Formatting">' +
        '  <select class="kr-block" aria-label="Text style">' +
        '    <option value="p">Paragraph</option><option value="h2">Heading</option><option value="h3">Subheading</option>' +
        '  </select>' +
        '  <span class="kr-sep"></span>' +
        btn('bold', 'fa-bold', 'Bold (Ctrl+B)') + btn('italic', 'fa-italic', 'Italic (Ctrl+I)') +
        '  <span class="kr-sep"></span>' +
        btn('insertUnorderedList', 'fa-list-ul', 'Bulleted list') + btn('insertOrderedList', 'fa-list-ol', 'Numbered list') +
        btn('quote', 'fa-quote-left', 'Quote') +
        '  <span class="kr-sep"></span>' +
        btn('link', 'fa-link', 'Add link') + btn('unlink', 'fa-link-slash', 'Remove link') +
        btn('removeFormat', 'fa-text-slash', 'Clear formatting') +
        '  <span class="kr-sep"></span>' +
        btn('undo', 'fa-rotate-left', 'Undo (Ctrl+Z)') + btn('redo', 'fa-rotate-right', 'Redo (Ctrl+Y)') +
        '</div>' +
        '<div class="kr-area" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article content" data-placeholder="Start writing your article. Use Heading for section titles; press Enter for a new paragraph."></div>' +
        '<div class="kr-foot"><span class="kr-count">0 words</span><span class="kr-hint">Paste from Word or Google Docs keeps headings, lists and links.</span></div>';
    function btn(cmd, icon, label) {
        return '<button type="button" class="kr-btn" data-cmd="' + cmd + '" title="' + label + '" aria-label="' + label + '"><i class="fa-solid ' + icon + '"></i></button>';
    }
    textarea.hidden = true;
    textarea.parentNode.insertBefore(wrap, textarea);
    var area = wrap.querySelector('.kr-area');
    var blockSel = wrap.querySelector('.kr-block');
    var countEl = wrap.querySelector('.kr-count');

    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browsers */ }

    function sync() {
        textarea.value = clean(area.innerHTML);
        var words = (area.textContent.match(/\S+/g) || []).length;
        countEl.textContent = words + (words === 1 ? ' word' : ' words') + (words ? ' · ' + Math.max(1, Math.round(words / 200)) + ' min read' : '');
        area.classList.toggle('is-empty', !area.textContent.trim() && !area.querySelector('li'));
    }

    function currentBlock() {
        var sel = window.getSelection();
        if (!sel.rangeCount) return null;
        var n = sel.getRangeAt(0).startContainer;
        while (n && n !== area) {
            if (n.nodeType === 1 && /^(P|H2|H3|BLOCKQUOTE|LI)$/.test(n.tagName)) return n;
            n = n.parentNode;
        }
        return null;
    }
    function updateToolbar() {
        var b = currentBlock();
        var tag = b ? b.tagName.toLowerCase() : 'p';
        blockSel.value = tag === 'h2' || tag === 'h3' ? tag : 'p';
        ['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].forEach(function (cmd) {
            var on = false;
            try { on = document.queryCommandState(cmd); } catch (e) { /* ignore */ }
            wrap.querySelector('[data-cmd="' + cmd + '"]').classList.toggle('is-on', on);
        });
        wrap.querySelector('[data-cmd="quote"]').classList.toggle('is-on', !!(b && b.closest && b.closest('blockquote')));
    }

    wrap.querySelector('.kr-bar').addEventListener('mousedown', function (e) {
        // Keep the text selection when clicking toolbar buttons
        if (e.target.closest('.kr-btn')) e.preventDefault();
    });
    wrap.querySelector('.kr-bar').addEventListener('click', function (e) {
        var b = e.target.closest('.kr-btn');
        if (!b) return;
        area.focus();
        var cmd = b.getAttribute('data-cmd');
        if (cmd === 'quote') {
            var blk = currentBlock();
            document.execCommand('formatBlock', false, blk && blk.closest('blockquote') ? 'p' : 'blockquote');
        } else if (cmd === 'link') {
            var url = prompt('Link address (https://…, or a page like contact.html):', 'https://');
            if (url && url !== 'https://') document.execCommand('createLink', false, url.trim());
        } else {
            document.execCommand(cmd, false, null);
        }
        sync();
        updateToolbar();
    });
    blockSel.addEventListener('change', function () {
        area.focus();
        document.execCommand('formatBlock', false, blockSel.value);
        sync();
    });

    area.addEventListener('input', sync);
    area.addEventListener('keyup', updateToolbar);
    area.addEventListener('mouseup', updateToolbar);
    area.addEventListener('paste', function (e) {
        var data = e.clipboardData;
        if (!data) return;
        e.preventDefault();
        var html = data.getData('text/html');
        var text = data.getData('text/plain');
        document.execCommand('insertHTML', false, html ? clean(html) : fromPlainText(text));
        sync();
    });

    window.KhRich = {
        set: function (html) {
            area.innerHTML = looksLikeHtml(html) ? clean(html) : fromPlainText(html);
            sync();
        },
        get: function () { sync(); return textarea.value; }
    };
    sync();
})();
