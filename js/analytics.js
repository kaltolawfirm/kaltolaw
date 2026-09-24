// Google Analytics 4 (GA4) Configuration Placeholder
// Instructions: Replace 'G-XXXXXXXXXX' with your actual Measurement ID.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

// Meta Pixel Configuration Placeholder
// Instructions: Replace 'XXXXXXXXXXXXXXXX' with your actual Meta Pixel ID.
const META_PIXEL_ID = 'XXXXXXXXXXXXXXXX';

// --- Initialize GA4 ---
if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
}

// --- Initialize Meta Pixel ---
if (META_PIXEL_ID && META_PIXEL_ID !== 'XXXXXXXXXXXXXXXX') {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
}

// Helper function to track specific events
window.trackCustomEvent = function(eventName, parameters = {}) {
    // Track in GA4
    if (typeof gtag === 'function') {
        gtag('event', eventName, parameters);
    }
    // Track in Meta Pixel
    if (typeof fbq === 'function') {
        fbq('trackCustom', eventName, parameters);
    }
    console.log(`Analytics Event Tracked: ${eventName}`, parameters);
};
