/**
 * KALTO LAW - Newsletter Subscription System
 * Handles Firebase Firestore subscriber storage + modal popup timing
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- Newsletter Modal Logic ---
    const modal = document.getElementById('newsletterModal');
    const closeBtn = document.getElementById('nlModalClose');
    const modalForm = document.getElementById('newsletterModalForm');

    function openModal() {
        if (modal && !sessionStorage.getItem('nlShown')) {
            modal.classList.add('active');
            sessionStorage.setItem('nlShown', '1');
        }
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
    }

    // Show modal after 30 seconds
    if (modal) {
        // setTimeout(openModal, 30000); // Disabled auto-popup as per user request
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    // --- Subscribe Handler (shared for modal & inline form) ---
    async function handleSubscribe(email, name, btn, feedbackEl) {
        if (!email) return;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subscribing...';
        btn.disabled = true;
        try {
            // Check if Firebase is ready
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                const fsDb = firebase.firestore();
                await fsDb.collection('newsletter_subscribers').add({
                    name: name || '',
                    email: email,
                    subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    source: window.location.pathname
                });
            }
            btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Subscribed!';
            btn.style.background = 'var(--color-success)';
            if (feedbackEl) { feedbackEl.textContent = '✓ Thank you! You are now subscribed.'; feedbackEl.style.color = 'var(--color-success)'; }
            setTimeout(() => closeModal(), 2000);
        } catch (err) {
            console.error('Newsletter error:', err);
            btn.innerHTML = orig;
            btn.disabled = false;
            if (feedbackEl) { feedbackEl.textContent = 'Error. Please try again.'; feedbackEl.style.color = 'var(--color-error)'; }
        }
    }

    // Modal form
    if (modalForm) {
        const feedback = document.createElement('p');
        feedback.className = 'nl-feedback';
        modalForm.appendChild(feedback);
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('nlModalEmail').value.trim();
            const name = document.getElementById('nlModalName').value.trim();
            const btn = modalForm.querySelector('button[type="submit"]');
            await handleSubscribe(email, name, btn, feedback);
        });
    }

    // Inline form (newsletter section on homepage)
    const inlineForm = document.getElementById('newsletterFormInline');
    if (inlineForm) {
        const feedback = document.createElement('p');
        feedback.className = 'nl-feedback';
        inlineForm.appendChild(feedback);
        inlineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletterEmailInline').value.trim();
            const btn = inlineForm.querySelector('button[type="submit"]');
            await handleSubscribe(email, '', btn, feedback);
        });
    }
});
