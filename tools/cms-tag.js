#!/usr/bin/env node
/*
 * Tags editable content on the public pages and writes the CMS registry.
 *
 *   node tools/cms-tag.js
 *
 * - Adds data-cms="p:<key>" (page field) or data-cms="g:<key>" (site-wide field,
 *   header/footer) to every text element, link and image; data-cms-list="<key>"
 *   to repeatable lists, with data-cms-f="<field>" on the fields inside each item.
 * - Only inserts attributes; the rest of each file is left byte-for-byte as is.
 * - Safe to run again: already-tagged elements keep their keys.
 * - Writes js/cms-registry.json, which the dashboard's Website Editor reads.
 *   Values in the registry are the current HTML, used as defaults.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

const PAGES = {
    'index': 'Home',
    'about': 'About us',
    'team': 'Our team',
    'practice-areas': 'Practice areas',
    'corporate-law': 'Corporate law',
    'company-matters': 'Company matters',
    'commercial-matters': 'Commercial matters',
    'adr': 'Dispute resolution (ADR)',
    'family-matters': 'Family matters',
    'real-estate-planning': 'Real estate planning',
    'labour-law': 'Labour law',
    'consumer-protection': 'Consumer protection',
    'tax-law': 'Tax law',
    'case-results': 'Case results',
    'track-case': 'Track your case',
    'fee-estimator': 'Fee estimator',
    'faq': 'FAQ',
    'blog': 'Legal insights',
    'contact': 'Contact',
    'legal-templates': 'Legal templates',
    'pay': 'Payments',
    'privacy-policy': 'Privacy policy',
    'disclaimer': 'Disclaimer',
    '404': 'Page not found',
    'blog-post': 'Blog post page',
};

// Repeatable lists (outermost match wins; lists are not nested)
const LIST_SELECTORS = [
    '#kh-menu ul', '.kh-footer-col:not(:last-child) ul',
    '.kh-stats', '.kh-cards', '.kh-why-points', '.kh-post-list',
    '.ka-stats', '.ka-cards', '.ka-area-grid', '.ka-faq-list', '.ka-checks', '.ka-chips',
    '.ka-facts', '.ka-contact-list', '.ka-doc', '.ka-doc-toc ol',
    '.cr-filter-bar', '.cr-grid', '.blog-grid-container',
    '.est-options-grid', '.est-options-row', '.estimator-sidebar',
];

// Attributes on a list item's root that editors may change (filters, prices, counters)
const ITEM_ATTRS = ['data-category', 'data-filter', 'data-area', 'data-base-low', 'data-base-high',
    'data-complexity', 'data-label', 'data-consult', 'data-consult-label'];

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'TEMPLATE', 'SELECT', 'OPTION',
    'TEXTAREA', 'INPUT', 'IFRAME', 'CANVAS']);
// Script-driven areas: their text is replaced at runtime
const SKIP_INSIDE = '#dynamic-blog-grid, #documentList, #commentList, #uploadProgress, #estResult .est-result-range, #kh-post-list-dynamic';
const INLINE_OK = new Set(['STRONG', 'EM', 'B', 'U', 'BR', 'SMALL', 'MARK', 'CODE', 'SUP', 'SUB', 'A']);

const norm = t => (t || '').replace(/\s+/g, ' ').trim();
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 7);

function directText(el) {
    let t = '';
    el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.nodeValue; });
    return norm(t);
}

// "html": replace innerHTML; "text": only the element's own text (keeps icons/arrows)
function modeFor(el) {
    for (const c of el.children) {
        if (c.tagName === 'I' && /\bfa-/.test(c.className)) return 'text';
        if (!INLINE_OK.has(c.tagName) && !(c.tagName === 'SPAN' && !c.className)) return 'text';
        if (c.tagName === 'A' && el.tagName === 'A') return 'text';
    }
    return 'html';
}

function valueFor(el, mode) {
    if (mode === 'text') return directText(el);
    return el.innerHTML.replace(/\s+/g, ' ').trim();
}

function labelFor(el) {
    const t = el.tagName;
    if (el.closest('summary')) return 'Question';
    if (el.closest('details') && t === 'P') return 'Answer';
    if (t === 'H1') return 'Page title';
    if (/^H[2-6]$/.test(t)) return 'Heading';
    if (t === 'A') return el.classList.contains('kh-pill') || el.classList.contains('btn') ? 'Button text' : 'Link text';
    if (t === 'BUTTON') return 'Button text';
    if (t === 'LI') return 'List item';
    if (t === 'LABEL') return 'Form label';
    if (t === 'FIGCAPTION') return 'Caption';
    if (t === 'STRONG' || t === 'B') return 'Bold text';
    if (t === 'DT') return 'Term';
    return 'Text';
}

function sectionLabel(el) {
    const box = el.closest('section, header, footer, aside, nav, form, article, main') || el.ownerDocument.body;
    if (box.tagName === 'HEADER') return 'Header';
    if (box.tagName === 'FOOTER') return 'Footer';
    const h = box.querySelector('h1, h2, h3');
    if (h) return norm(h.textContent).slice(0, 60);
    return box.getAttribute('aria-label') || 'Page content';
}

// Elements that carry editable text: own text, no already-chosen ancestor
function textFields(scope, isInside) {
    const out = [];
    const walk = (el, taken) => {
        if (SKIP_TAGS.has(el.tagName.toUpperCase())) return;
        if (el.matches && el.matches(SKIP_INSIDE)) return;
        if (!isInside(el)) return;
        let chosen = taken;
        const hasOwn = directText(el).length > 0;
        const dynamicId = el.id && !/-h$/.test(el.id);
        if (!taken && hasOwn && !dynamicId && el !== scope) {
            out.push({ el, kind: 'text' });
            chosen = true;
        }
        if (el.tagName === 'IMG' && !taken) out.push({ el, kind: 'img' });
        if (el.tagName === 'A' && !hasOwn && !taken && el.getAttribute('href') && !el.querySelector('img')) out.push({ el, kind: 'href' });
        for (const c of el.children) walk(c, chosen);
    };
    for (const c of scope.children) walk(c, false);
    return out;
}

function tagPage(file, slug) {
    const src = fs.readFileSync(file, 'utf8');
    const dom = new JSDOM(src, { includeNodeLocations: true });
    const doc = dom.window.document;
    const inserts = [];
    const addAttr = (el, name, value) => {
        if (el.hasAttribute(name)) return;
        const loc = dom.nodeLocation(el);
        if (!loc || !loc.startTag) return;
        let at = loc.startTag.endOffset - 1;
        if (src[at - 1] === '/') at -= 1;
        inserts.push([at, ` ${name}="${value}"`]);
    };

    const page = { title: PAGES[slug], sections: {}, lists: [], meta: {} };
    const global = { sections: {}, lists: [] };
    const used = { p: {}, g: {} };
    const section = (store, label) => (store.sections[label] = store.sections[label] || { fields: [], lists: [] });

    page.meta = {
        title: norm((doc.querySelector('title') || {}).textContent),
        description: ((doc.querySelector('meta[name="description"]') || { getAttribute: () => '' }).getAttribute('content') || ''),
    };

    const main = doc.querySelector('main');
    const header = doc.querySelector('header.kh-header');
    const footer = doc.querySelector('footer.kh-footer');
    const regions = [];
    if (header) regions.push({ root: header, scope: 'g' });
    if (footer) regions.push({ root: footer, scope: 'g' });
    if (main) regions.push({ root: main, scope: 'p' });
    else regions.push({ root: doc.body, scope: 'p', exclude: el => el.closest('.kh-bar, header, footer, #toast, .modal-overlay') });

    for (const region of regions) {
        const store = region.scope === 'p' ? page : global;
        const inRegion = el => region.root.contains(el) && !(region.exclude && region.exclude(el));

        // Lists first (outermost only)
        const lists = [];
        for (const sel of LIST_SELECTORS) {
            region.root.querySelectorAll(sel).forEach(c => {
                if (!inRegion(c) || lists.some(l => l.contains(c) || c.contains(l))) return;
                if (c.matches(SKIP_INSIDE) || c.closest(SKIP_INSIDE)) return;
                if (c.children.length) lists.push(c);
            });
        }
        const inList = el => lists.some(l => l !== el && l.contains(el));

        lists.forEach((c, li) => {
            const first = c.children[0];
            const itemSel = first.tagName.toLowerCase() + (first.classList[0] ? '.' + first.classList[0] : '');
            const items = [...c.children].filter(k => k.matches(itemSel));
            let key = (c.getAttribute('data-cms-list') || '').split(':')[1];
            if (!key) {
                key = hash(region.scope + (c.className || c.tagName) + norm(c.textContent).slice(0, 80));
                while (used[region.scope]['L' + key]) key = hash(key + li);
            }
            used[region.scope]['L' + key] = 1;
            addAttr(c, 'data-cms-list', `${region.scope}:${key}`);

            // Field schema from the first item; every item gets the same data-cms-f names
            const schema = [];
            const itemValues = items.map(() => ({}));
            items.forEach((item, ii) => {
                const flds = textFields(item, () => true);
                let n = 0;
                flds.forEach(f => {
                    const name = 'f' + n++;
                    if (ii === 0) {
                        const tagsRow = f.el.closest('.cr-tag-row');
                        schema.push({ name, type: f.kind === 'img' ? 'img' : f.kind === 'href' ? 'href' : 'text', label: f.kind === 'img' ? 'Image' : f.kind === 'href' ? 'Link' : labelFor(f.el), mode: f.kind === 'text' ? modeFor(f.el) : undefined, link: f.el.tagName === 'A' && f.kind === 'text' ? true : undefined, tags: tagsRow ? true : undefined });
                    }
                    addAttr(f.el, 'data-cms-f', name);
                    if (f.kind === 'img') itemValues[ii][name] = { src: f.el.getAttribute('src'), alt: f.el.getAttribute('alt') || '' };
                    else if (f.kind === 'href') itemValues[ii][name] = f.el.getAttribute('href');
                    else {
                        itemValues[ii][name] = valueFor(f.el, modeFor(f.el));
                        if (f.el.tagName === 'A') itemValues[ii][name + '@href'] = f.el.getAttribute('href');
                    }
                });
                ITEM_ATTRS.forEach(a => {
                    if (item.hasAttribute(a)) {
                        if (ii === 0) schema.push({ name: '@' + a, type: 'attr', label: a.replace(/^data-/, '').replace(/-/g, ' ') });
                        itemValues[ii]['@' + a] = item.getAttribute(a);
                    }
                });
            });
            const label = sectionLabel(c);
            section(store, label).lists.push({ key: `${region.scope}:${key}`, itemSelector: itemSel, schema, items: itemValues });
        });

        // Single fields outside lists
        textFields(region.root, el => inRegion(el) && !inList(el) && !lists.includes(el)).forEach(f => {
            if (lists.some(l => l.contains(f.el))) return;
            const el = f.el;
            let key = (el.getAttribute('data-cms') || '').split(':')[1];
            const legacy = el.getAttribute('data-cms-id');
            if (!key) {
                const basis = f.kind === 'img' ? el.getAttribute('src') : f.kind === 'href' ? el.getAttribute('href') + el.getAttribute('aria-label') : el.tagName + valueFor(el, modeFor(el));
                key = legacy || hash(region.scope + basis);
                let k = key, i = 2;
                while (used[region.scope][k]) k = key + '-' + i++;
                key = k;
            }
            used[region.scope][key] = 1;
            addAttr(el, 'data-cms', `${region.scope}:${key}`);
            const entry = { key: `${region.scope}:${key}`, label: f.kind === 'img' ? 'Image' : f.kind === 'href' ? 'Link' : labelFor(el) };
            if (f.kind === 'img') Object.assign(entry, { type: 'img', value: { src: el.getAttribute('src'), alt: el.getAttribute('alt') || '' } });
            else if (f.kind === 'href') Object.assign(entry, { type: 'href', value: el.getAttribute('href'), hint: el.getAttribute('aria-label') || '' });
            else {
                const mode = modeFor(el);
                Object.assign(entry, { type: 'text', mode, value: valueFor(el, mode) });
                if (el.tagName === 'A' && el.getAttribute('href')) entry.href = el.getAttribute('href');
                if (legacy) entry.legacy = legacy;
            }
            section(store, sectionLabel(el)).fields.push(entry);
        });
    }

    inserts.sort((a, b) => b[0] - a[0]);
    let out = src;
    for (const [at, text] of inserts) out = out.slice(0, at) + text + out.slice(at);
    fs.writeFileSync(file, out);
    return { page, global, count: inserts.length };
}

const registry = {
    version: 1,
    settings: {
        phone: '+250 790 750 000',
        email: 'info.blaw223@yahoo.com',
        whatsapp: '250790750000',
        youtube: '',
    },
    global: null,
    pages: {},
};

for (const slug of Object.keys(PAGES)) {
    const file = path.join(ROOT, slug + '.html');
    if (!fs.existsSync(file)) continue;
    const { page, global, count } = tagPage(file, slug);
    registry.pages[slug] = page;
    if (!registry.global && Object.keys(global.sections).length) registry.global = global;
    console.log(`${slug.padEnd(22)} +${count} attributes`);
}

fs.writeFileSync(path.join(ROOT, 'js', 'cms-registry.json'), JSON.stringify(registry));
console.log('wrote js/cms-registry.json');
