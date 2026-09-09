document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const message = document.querySelector('.auth-message');
  const requestedPage = new URLSearchParams(window.location.search).get('next');
  const isSafeNextPage = requestedPage && !requestedPage.includes('://') && !requestedPage.startsWith('//');
  const nextPage = isSafeNextPage ? requestedPage : 'index.html';
  if (!form || !message) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';

    if (!form.checkValidity()) {
      message.textContent = 'Please complete the form with valid details.';
      return;
    }

    const isSignup = form.id === 'signup-form';
    const payload = Object.fromEntries(new FormData(form));
    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        message.textContent = result.message || 'Authentication failed.';
        return;
      }

      window.location.href = nextPage;
    } catch (error) {
      message.textContent = 'The server is unavailable. Please try again later.';
    }
  });
});
