// Firebase Configuration for KALTO LAW
const firebaseConfig = {
    apiKey: "AIzaSyC-dBhS8buRdeDHtfEqKAfz_G6LEgpDSa8",
    authDomain: "kalto-law.firebaseapp.com",
    projectId: "kalto-law",
    storageBucket: "kalto-law.firebasestorage.app",
    messagingSenderId: "596851588699",
    appId: "1:596851588699:web:71089a814478b55532097e",
    measurementId: "G-11XBGR7XBX"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Initialize Google Analytics (GA4) dynamically
if (firebaseConfig.measurementId && !window.gtag) {
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${firebaseConfig.measurementId}`;
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', firebaseConfig.measurementId);
    console.log('Google Analytics visitor tracking activated.');
}
