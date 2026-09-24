document.addEventListener('DOMContentLoaded', () => {
    // --- Production Enhancements (Injected UI) ---
    // 1. Inject Preloader
    if (!document.getElementById('global-preloader')) {
        const preloader = document.createElement('div');
        preloader.id = 'global-preloader';
        preloader.innerHTML = '<div class="loader-spinner"></div>';
        document.body.prepend(preloader);
        
        // Hide after 1s or on load
        window.addEventListener('load', () => {
            setTimeout(() => {
                preloader.classList.add('hidden');
                setTimeout(() => preloader.remove(), 500);
            }, 500);
        });
        // Fallback
        setTimeout(() => {
            if(document.getElementById('global-preloader')) {
                preloader.classList.add('hidden');
                setTimeout(() => preloader.remove(), 500);
            }
        }, 2000);
    }

    // 2. Inject Back to Top Button
    if (!document.getElementById('backToTopBtn')) {
        const btn = document.createElement('button');
        btn.id = 'backToTopBtn';
        btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        btn.setAttribute('aria-label', 'Back to top');
        document.body.appendChild(btn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        });

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 3. Inject Cookie Banner
    if (!localStorage.getItem('cookieConsent') && !document.getElementById('cookie-banner')) {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.innerHTML = `
            <p>We use cookies to improve your experience and for analytics. By continuing to browse, you agree to our <a href="privacy-policy.html" style="color: var(--color-accent); text-decoration: underline;">Privacy Policy</a>.</p>
            <div>
                <button id="acceptCookies" class="btn btn-primary" style="margin-right: 10px;">Accept</button>
                <button id="declineCookies" class="btn btn-outline" style="border-color: white; color: white;">Decline</button>
            </div>
        `;
        document.body.appendChild(banner);
        
        setTimeout(() => banner.classList.add('show'), 1500);

        document.getElementById('acceptCookies').addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'accepted');
            banner.classList.remove('show');
        });
        document.getElementById('declineCookies').addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'declined');
            banner.classList.remove('show');
        });
    }

    // --- Existing UI Logic ---
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuToggle.querySelector('i').classList.toggle('fa-bars');
            mobileMenuToggle.querySelector('i').classList.toggle('fa-xmark');
        });
    }

    // --- Premium Animations (Parallax & Reveal) ---
    const setupPremiumAnimations = () => {
        // 1. Staggered Text Reveal
        const revealTexts = document.querySelectorAll('.reveal-text');
        revealTexts.forEach(el => {
            const text = el.innerText;
            el.innerHTML = '';
            text.split(' ').forEach((word, i) => {
                const span = document.createElement('span');
                span.className = 'word';
                span.innerText = word + (i < text.split(' ').length - 1 ? '\u00A0' : '');
                span.style.transitionDelay = `${i * 0.1}s`;
                el.appendChild(span);
            });
        });

        // 2. Mouse Parallax for Header Marquee
        const headers = document.querySelectorAll('.premium-page-header');
        headers.forEach(header => {
            const marquee = header.querySelector('.marquee-bg');
            if (marquee) {
                header.addEventListener('mousemove', (e) => {
                    const { left, width, top, height } = header.getBoundingClientRect();
                    const x = (e.clientX - left) / width - 0.5;
                    const y = (e.clientY - top) / height - 0.5;
                    marquee.style.transform = `translate(${x * 30}px, calc(-50% + ${y * 20}px))`;
                });

                header.addEventListener('mouseleave', () => {
                    marquee.style.transform = `translate(0, -50%)`;
                });
            }
        });

        // Trigger reveal when in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0 }); // Trigger immediately when any part is visible

        revealTexts.forEach(t => {
            observer.observe(t);
            // Enhanced fallback: Trigger instantly if already in view
            const rect = t.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                setTimeout(() => t.classList.add('active'), 50);
            }
        });
        
        // Safety timeout: If nothing happens after 3s, show all reveals
        setTimeout(() => {
            document.querySelectorAll('.reveal-text:not(.active), .reveal-on-scroll:not(.active)').forEach(el => {
                el.classList.add('active');
            });
        }, 3000);
    };

    // --- I18n (Internationalization) Logic ---
    const applyTranslations = (lang = 'en') => {
        const trans = window.siteTranslations ? window.siteTranslations[lang] : null;
        if (!trans) return;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (trans[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = trans[key];
                } else {
                    el.innerHTML = trans[key];
                }
            }
        });

        // Refresh animations after translation
        if (window.refreshAnimations) window.refreshAnimations();
    };

    // Initialize Animations and Translations
    setupPremiumAnimations();
    applyTranslations('en'); // Default to English

    // Re-setup animations if CMS content changes them
    window.refreshAnimations = () => {
        const revealTexts = document.querySelectorAll('.reveal-text');
        revealTexts.forEach(el => {
            const text = el.innerText;
            if (text.trim() && !el.querySelector('.word')) {
                el.innerHTML = '';
                text.split(' ').forEach((word, i) => {
                    const span = document.createElement('span');
                    span.className = 'word';
                    span.innerText = word + ' ';
                    span.style.transitionDelay = `${i * 0.1}s`;
                    el.appendChild(span);
                });
            }
        });
    };

    // --- CMS Logic (Firebase Compat for Local File Support) ---
    async function loadCMSContent() {
        const cmsElements = document.querySelectorAll('[data-cms-id]');
        const blogGrid = document.querySelector('.blog-grid-container');
        if (cmsElements.length === 0 && !blogGrid) return;

        console.log('CMS: Initializing...');

        // Load Firebase Compat Scripts dynamically
        const scripts = [
            "https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js",
            "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"
        ];

        for (const src of scripts) {
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        const firebaseConfig = {
            apiKey: "AIzaSyC-dBhS8buRdeDHtfEqKAfz_G6LEgpDSa8",
            authDomain: "kalto-law.firebaseapp.com",
            projectId: "kalto-law",
            storageBucket: "kalto-law.firebasestorage.app",
            messagingSenderId: "596851588699",
            appId: "1:596851588699:web:71089a814478b55532097e",
            measurementId: "G-11XBGR7XBX"
        };

        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // 1. Load Site Text Updates
        cmsElements.forEach(async el => {
            const cmsId = el.getAttribute('data-cms-id');
            try {
                const docSnap = await db.collection("website_content").doc(cmsId).get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data.content) {
                        el.innerHTML = data.content;
                        // Trigger animation refresh if this was a reveal-text element
                        if (el.classList.contains('reveal-text')) {
                            el.classList.remove('active');
                            window.refreshAnimations();
                            setTimeout(() => el.classList.add('active'), 100);
                        }
                    }
                }
            } catch (err) { console.log(`CMS: Error loading ${cmsId}`, err); }
        });

        // 2. Load Legal Insights (Blog) - dynamic section
        const dynamicBlogGrid = document.getElementById('dynamic-blog-grid');
        const dynamicSection = document.getElementById('dynamic-insights-section');
        if (dynamicBlogGrid && window.location.pathname.includes('blog.html')) {
            try {
                const querySnapshot = await db.collection("insights").orderBy("createdAt", "desc").get();
                if (!querySnapshot.empty) {
                    dynamicSection.style.display = 'block';
                    dynamicBlogGrid.innerHTML = '';
                    querySnapshot.forEach((doc) => {
                        const post = doc.data();
                        const coverSrc = post.coverImage || 'images/blog-img-fallback.jpg';
                        const article = document.createElement('article');
                        article.className = 'blog-card';
                        article.innerHTML = `
                            <div class="blog-image">
                                <img src="${coverSrc}" alt="${post.title}" style="width:100%;height:200px;object-fit:cover;border-radius:var(--radius-sm) var(--radius-sm) 0 0;" onerror="this.src='images/blog-img-fallback.jpg'">
                            </div>
                            <div class="blog-content">
                                <div class="blog-meta"><i class="fa-regular fa-calendar"></i> <span>${post.category || 'Legal Insight'}</span></div>
                                <h3 class="mb-sm"><a href="blog-post.html?id=${doc.id}" class="text-navy">${post.title}</a></h3>
                                <p>${post.description || ''}</p>
                                <a href="blog-post.html?id=${doc.id}" class="text-link"><span>Read Article</span> <i class="fa-solid fa-arrow-right"></i></a>
                            </div>
                        `;
                        dynamicBlogGrid.appendChild(article);
                    });
                }
            } catch (e) { console.log("CMS: Error loading blog posts", e); }
        }

    }

    loadCMSContent();

    // --- Tawk.to Live Chat (Temporarily Removed) ---
    // User requested removal as it overlaps with UI elements like the Send Message button.
});
