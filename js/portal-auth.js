// portal-auth.js — handles authentication for login.html and guards portal.html

const firebaseConfig = {
    apiKey: "AIzaSyC-dBhS8buRdeDHtfEqKAfz_G6LEgpDSa8",
    authDomain: "kalto-law.firebaseapp.com",
    projectId: "kalto-law",
    storageBucket: "kalto-law.firebasestorage.app",
    messagingSenderId: "596851588699",
    appId: "1:596851588699:web:71089a814478b55532097e"
};

// Avoid double-initializing if Firebase is already loaded
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Make globally available for portal-dashboard.js
window.fbAuth = auth;
window.fbDb = db;

// ─── Helper: Show Error ───────────────────────────────────────────────────────
function showAuthError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}
function clearAuthError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
}

// ─── Create/update user profile doc ─────────────────────────────────────────
async function ensureUserProfile(user, extraData = {}) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({
            name: user.displayName || extraData.name || '',
            email: user.email || '',
            phone: extraData.phone || '',
            photoURL: user.photoURL || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            role: 'client'
        });
    }
    // If there's a tracking code to claim, link it
    if (extraData.trackingCode) {
        await claimCase(user.uid, extraData.trackingCode.trim().toUpperCase());
    }
}

// ─── Self-claim a case by tracking code ──────────────────────────────────────
async function claimCase(uid, trackingCode) {
    if (!trackingCode) return;
    try {
        const snap = await db.collection('cases')
            .where('trackingCode', '==', trackingCode)
            .limit(1)
            .get();
        if (!snap.empty) {
            await snap.docs[0].ref.update({ uid });
            console.log(`Case ${trackingCode} linked to user ${uid}`);
        }
    } catch (e) {
        console.warn('Could not claim case:', e);
    }
}

// ─── Handle Email/Password Login ─────────────────────────────────────────────
window.handleLogin = async function() {
    clearAuthError('loginError');
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
        return showAuthError('loginError', 'Please enter your email and password.');
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'portal.html';
    } catch (err) {
        const messages = {
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
        };
        showAuthError('loginError', messages[err.code] || 'Sign in failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Portal';
    }
};

// ─── Handle Registration ──────────────────────────────────────────────────────
window.handleRegister = async function() {
    clearAuthError('registerError');
    const name = document.getElementById('regName')?.value?.trim();
    const email = document.getElementById('regEmail')?.value?.trim();
    const phone = document.getElementById('regPhone')?.value?.trim();
    const password = document.getElementById('regPassword')?.value;
    const trackingCode = document.getElementById('regTrackingCode')?.value?.trim();
    const btn = document.getElementById('registerBtn');

    if (!name || !email || !password) {
        return showAuthError('registerError', 'Please fill in your name, email, and password.');
    }
    if (password.length < 8) {
        return showAuthError('registerError', 'Password must be at least 8 characters long.');
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await ensureUserProfile(cred.user, { name, phone, trackingCode });

        const successEl = document.getElementById('registerSuccess');
        if (successEl) {
            successEl.textContent = 'Account created! Redirecting to your portal...';
            successEl.style.display = 'block';
        }
        setTimeout(() => window.location.href = 'portal.html', 1500);
    } catch (err) {
        const messages = {
            'auth/email-already-in-use': 'An account with this email already exists. Please sign in.',
            'auth/weak-password': 'Password is too weak. Please use at least 8 characters.',
            'auth/invalid-email': 'Please enter a valid email address.'
        };
        showAuthError('registerError', messages[err.code] || 'Registration failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create My Account';
    }
};

// ─── Google Sign-In ───────────────────────────────────────────────────────────
window.handleGoogleSignIn = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        await ensureUserProfile(result.user);
        window.location.href = 'portal.html';
    } catch (err) {
        const errId = document.getElementById('loginError') ? 'loginError' : 'registerError';
        if (err.code !== 'auth/popup-closed-by-user') {
            showAuthError(errId, 'Google Sign-In failed. Please try again or use email.');
        }
    }
};

// ─── Auth State & Guard ───────────────────────────────────────────────────────
auth.onAuthStateChanged((user) => {
    // If on portal.html and NOT logged in → send to login
    if (window.location.pathname.includes('portal.html')) {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            // Signal to portal-dashboard.js that user is ready
            window.currentUser = user;
            window.dispatchEvent(new Event('portalUserReady'));
        }
    }

    // If on login.html and already logged in → send to portal
    if (window.location.pathname.includes('login.html') && user) {
        window.location.href = 'portal.html';
    }

    window.dispatchEvent(new Event('portalReady'));
});
