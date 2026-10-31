// Blog post page: loads the post from Firestore (insights/{id}), counts a view
// once per browser session, and handles likes and public comments.
// Counter writes are limited by firestore.rules to +1 steps (likes may go -1).
(function () {
    var params = new URLSearchParams(window.location.search);
    var postId = params.get('id');
    var $ = function (id) { return document.getElementById(id); };

    function notFound() { $('postNotFound').style.display = 'block'; }

    if (!postId || typeof firebase === 'undefined' || !firebase.apps.length) {
        notFound();
        return;
    }

    var db = firebase.firestore();
    var inc = firebase.firestore.FieldValue.increment;
    var postRef = db.collection('insights').doc(postId);
    var counts = { views: 0, likes: 0, comments: 0 };

    // Storage can be unavailable (private mode); fall back to "not seen / not liked".
    function store(kind) {
        try { return window[kind]; } catch (e) { return null; }
    }
    function getFlag(kind, key) {
        var s = store(kind);
        try { return s ? s.getItem(key) === '1' : false; } catch (e) { return false; }
    }
    function setFlag(kind, key, on) {
        var s = store(kind);
        try { if (s) { on ? s.setItem(key, '1') : s.removeItem(key); } } catch (e) { /* ignore */ }
    }

    function renderCounts() {
        $('postViews').textContent = counts.views;
        $('postLikes').textContent = counts.likes;
        $('postLikesMeta').textContent = counts.likes;
        $('postCommentsMeta').textContent = counts.comments;
        $('commentsCount').textContent = '(' + counts.comments + ')';
        // "1 view" / "2 views"
        [['view', counts.views], ['like', counts.likes], ['comment', counts.comments]].forEach(function (u) {
            var el = document.querySelector('[data-unit="' + u[0] + '"]');
            if (el) el.textContent = u[1] === 1 ? u[0] : u[0] + 's';
        });
    }

    function formatWhen(ts) {
        var d = ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
        if (!d) return 'Just now';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // ---------- Post ----------
    postRef.get().then(function (snap) {
        if (!snap.exists) { notFound(); return; }
        var post = snap.data();

        document.title = post.title + ' - KALTO LAW';
        var meta = document.querySelector('meta[name="description"]');
        if (meta) meta.content = post.description || post.title;

        $('postCategoryBadge').textContent = post.category || 'Legal Insight';
        $('postTitle').textContent = post.title;
        $('postCategoryMeta').textContent = post.category || 'Legal Insight';
        if (post.createdAt && post.createdAt.toDate) {
            $('postDate').textContent = post.createdAt.toDate()
                .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        $('postHero').style.display = 'block';

        if (post.coverImage) {
            var img = $('postCoverImg');
            img.src = post.coverImage;
            img.alt = post.title;
            img.style.display = 'block';
        }

        // Content is written by staff in the admin panel
        var body = $('postBody');
        if (post.content && /<(p|h[1-6]|ul|ol|li|br|div|strong|em|b|i|blockquote|a)\b/i.test(post.content)) {
            body.innerHTML = post.content;
        } else if (post.content) {
            // Older posts were typed as plain text: blank lines separate paragraphs
            post.content.split(/\n\s*\n/).forEach(function (block) {
                if (!block.trim()) return;
                var p = document.createElement('p');
                block.trim().split('\n').forEach(function (line, i) {
                    if (i) p.appendChild(document.createElement('br'));
                    p.appendChild(document.createTextNode(line));
                });
                body.appendChild(p);
            });
        } else if (post.description) {
            var p = document.createElement('p');
            p.className = 'kp-lede';
            p.textContent = post.description;
            body.appendChild(p);
        }
        $('postSection').style.display = 'block';

        counts.views = post.views || 0;
        counts.likes = post.likes || 0;
        counts.comments = post.comments || 0;

        // Count this view once per browser session
        var viewKey = 'kh-viewed-' + postId;
        if (!getFlag('sessionStorage', viewKey)) {
            setFlag('sessionStorage', viewKey, true);
            counts.views += 1;
            postRef.update({ views: inc(1) }).catch(function () {
                counts.views -= 1;
                setFlag('sessionStorage', viewKey, false);
                renderCounts();
            });
        }

        setLiked(getFlag('localStorage', 'kh-liked-' + postId));
        renderCounts();
        loadComments();
    }).catch(function (e) {
        console.error('Error loading post:', e);
        notFound();
    });

    // ---------- Likes ----------
    var likeBtn = $('postLikeBtn');
    var liking = false;

    function setLiked(on) {
        likeBtn.classList.toggle('is-liked', on);
        likeBtn.setAttribute('aria-pressed', String(on));
        likeBtn.querySelector('.kp-like-label').textContent = on ? 'Liked' : 'Like';
        var icon = likeBtn.querySelector('i');
        icon.classList.toggle('fa-regular', !on);
        icon.classList.toggle('fa-solid', on);
    }

    likeBtn.addEventListener('click', function () {
        if (liking) return;
        var key = 'kh-liked-' + postId;
        var on = !getFlag('localStorage', key);
        liking = true;
        setLiked(on);
        counts.likes = Math.max(0, counts.likes + (on ? 1 : -1));
        renderCounts();
        postRef.update({ likes: inc(on ? 1 : -1) }).then(function () {
            setFlag('localStorage', key, on);
        }).catch(function () {
            setLiked(!on);
            counts.likes = Math.max(0, counts.likes + (on ? -1 : 1));
            renderCounts();
        }).then(function () { liking = false; });
    });

    // ---------- Comments ----------
    var list = $('commentList');

    function commentItem(c) {
        var li = document.createElement('li');
        li.className = 'kp-comment';
        var avatar = document.createElement('span');
        avatar.className = 'kp-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = (c.name || '?').trim().charAt(0).toUpperCase();
        var body = document.createElement('div');
        var head = document.createElement('p');
        head.className = 'kp-comment-head';
        var name = document.createElement('strong');
        name.textContent = c.name;
        var when = document.createElement('span');
        when.textContent = formatWhen(c.createdAt);
        head.appendChild(name);
        head.appendChild(when);
        var text = document.createElement('p');
        text.className = 'kp-comment-text';
        text.textContent = c.text;
        body.appendChild(head);
        body.appendChild(text);
        li.appendChild(avatar);
        li.appendChild(body);
        return li;
    }

    function syncEmpty() {
        $('commentEmpty').hidden = list.children.length > 0;
    }

    function loadComments() {
        postRef.collection('comments').orderBy('createdAt', 'desc').limit(100).get()
            .then(function (snap) {
                list.innerHTML = '';
                snap.forEach(function (doc) { list.appendChild(commentItem(doc.data())); });
                syncEmpty();
            })
            .catch(function () { syncEmpty(); });
    }

    var form = $('commentForm');
    var status = $('commentStatus');
    var textEl = $('commentText');

    textEl.addEventListener('input', function () {
        $('commentChars').textContent = textEl.value.length;
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('commentName').value.trim();
        var text = textEl.value.trim();
        status.className = 'kp-status';
        if (!name || !text) {
            status.textContent = 'Enter your name and a comment, then post again.';
            status.classList.add('is-error');
            (name ? textEl : $('commentName')).focus();
            return;
        }

        var btn = $('commentSubmit');
        btn.disabled = true;
        status.textContent = 'Posting…';

        var ref = postRef.collection('comments').doc();
        var batch = db.batch();
        batch.set(ref, { name: name, text: text, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.update(postRef, { comments: inc(1) });
        batch.commit().then(function () {
            list.insertBefore(commentItem({ name: name, text: text }), list.firstChild);
            counts.comments += 1;
            renderCounts();
            syncEmpty();
            textEl.value = '';
            $('commentChars').textContent = '0';
            status.textContent = 'Comment posted.';
            status.classList.add('is-ok');
        }).catch(function () {
            status.textContent = 'Your comment could not be posted. Check your connection and try again.';
            status.classList.add('is-error');
        }).then(function () { btn.disabled = false; });
    });
})();
