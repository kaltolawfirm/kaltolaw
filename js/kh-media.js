// Homepage "Watch and read": click-to-play YouTube video + latest insights from Firestore.
document.addEventListener('DOMContentLoaded', function () {
    // --- Video: load the YouTube player only when the visitor presses play ---
    var video = document.querySelector('.kh-video');
    if (video) {
        var id = (video.getAttribute('data-video') || '').trim();
        var poster = video.querySelector('.kh-video-poster');
        if (id && poster) {
            poster.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
        }
        video.querySelector('.kh-video-play').addEventListener('click', function () {
            if (!id) {
                video.classList.add('is-empty');
                return;
            }
            var frame = document.createElement('iframe');
            frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
            frame.title = video.getAttribute('data-title') || 'YouTube video';
            frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            frame.allowFullscreen = true;
            video.innerHTML = '';
            video.appendChild(frame);
            video.classList.add('is-playing');
        });
    }

    // --- Insights: replace the curated resources with the firm's 4 newest posts, if any ---
    var list = document.getElementById('kh-post-list');
    if (!list || typeof firebase === 'undefined') return;

    function when(ts) {
        var d = ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
        if (!d) return '';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' \u00b7 ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function build(post, id) {
        var li = document.createElement('li');
        li.className = 'kh-post';
        var img = document.createElement('img');
        img.className = 'kh-post-img';
        img.alt = '';
        img.loading = 'lazy';
        img.src = post.coverImage || 'images/blog-img-1.jpg';
        img.onerror = function () { img.onerror = null; img.src = 'images/blog-img-1.jpg'; };
        var body = document.createElement('div');
        body.className = 'kh-post-body';
        var cat = document.createElement('span');
        cat.className = 'kh-post-cat';
        cat.textContent = post.category || 'Legal insight';
        var a = document.createElement('a');
        a.className = 'kh-post-title';
        a.href = 'blog-post.html?id=' + encodeURIComponent(id);
        a.textContent = post.title || 'Untitled';
        body.appendChild(cat);
        body.appendChild(a);
        var date = when(post.createdAt);
        if (date) {
            var meta = document.createElement('span');
            meta.className = 'kh-post-meta';
            meta.textContent = date;
            body.appendChild(meta);
        }
        li.appendChild(img);
        li.appendChild(body);
        return li;
    }

    try {
        if (!firebase.apps.length) return;
        firebase.firestore().collection('insights').orderBy('createdAt', 'desc').limit(4).get()
            .then(function (snap) {
                if (snap.empty) return;
                list.innerHTML = '';
                snap.forEach(function (doc) { list.appendChild(build(doc.data(), doc.id)); });
            })
            .catch(function () { /* keep the curated resources */ });
    } catch (e) { /* keep the curated resources */ }
});
