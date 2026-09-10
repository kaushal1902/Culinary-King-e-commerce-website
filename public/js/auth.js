// Global authentication & navigation controller for Culinary King
window.CulinaryKing = window.CulinaryKing || {};

document.addEventListener('DOMContentLoaded', async () => {
  const authContainers = document.querySelectorAll('[data-auth-container]');
  const authLinks = document.querySelectorAll('[data-auth-link]');
  const cartCounts = document.querySelectorAll('[data-cart-count]');

  // Highlight active navigation link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav_side a, .nav_links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });

  // Mobile menu toggle functionality
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const navSide = document.querySelector('.nav_side');
  if (mobileToggle && navSide) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navSide.classList.toggle('nav-open');
      mobileToggle.classList.toggle('active', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile nav when clicking outside
    document.addEventListener('click', (event) => {
      if (navSide.classList.contains('nav-open') &&
          !navSide.contains(event.target) &&
          !mobileToggle.contains(event.target)) {
        navSide.classList.remove('nav-open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Fetch Cart count
  async function updateCartBadge() {
    try {
      const response = await fetch('/api/cart', { credentials: 'same-origin' });
      if (!response.ok) return;
      const { cart } = await response.json();
      cartCounts.forEach(el => {
        el.textContent = cart.itemCount || 0;
      });
    } catch (err) {
      // ignore
    }
  }

  updateCartBadge();

  // Handle Authentication State & Static User Corner
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (response.ok) {
      const { user } = await response.json();
      window.CulinaryKing.currentUser = user;

      // Render static logged-in user header corner
      const userPillHtml = `
        <div class="user-corner-pill" id="user-menu-wrapper">
          <button class="user-corner-btn" id="user-menu-btn" type="button" aria-haspopup="true" aria-expanded="false">
            <span class="user-avatar-circle">${escapeHtml(user.name.charAt(0).toUpperCase())}</span>
            <span class="user-name-text">${escapeHtml(user.name)}</span>
            <i class="fa fa-angle-down" aria-hidden="true"></i>
          </button>
          <div class="user-dropdown-menu" id="user-dropdown" hidden>
            <div class="user-dropdown-header">
              <strong>${escapeHtml(user.name)}</strong>
              <small>${escapeHtml(user.email)}</small>
            </div>
            <a href="orders.html" class="user-dropdown-item"><i class="fa fa-shopping-bag"></i> My Orders</a>
            <a href="cart.html" class="user-dropdown-item"><i class="fa fa-shopping-cart"></i> My Cart</a>
            ${user.role === 'admin' ? '<a href="admin.html" class="user-dropdown-item admin-link"><i class="fa fa-tachometer text-primary"></i> <strong>Admin Portal</strong></a>' : ''}
            <hr class="user-dropdown-divider">
            <button type="button" class="user-dropdown-item logout-btn" id="global-logout-btn"><i class="fa fa-sign-out"></i> Log Out</button>
          </div>
        </div>
      `;

      authContainers.forEach(container => {
        container.innerHTML = userPillHtml;
      });

      // Legacy fallback for pages with just [data-auth-link]
      authLinks.forEach(link => {
        if (!link.closest('[data-auth-container]')) {
          link.innerHTML = `<span class="user-static-pill">👤 ${escapeHtml(user.name.split(' ')[0])}</span>`;
          link.href = 'orders.html';
          link.title = `Logged in as ${user.name}`;
        }
      });

      // Setup dropdown toggle
      document.querySelectorAll('#user-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dropdown = btn.parentElement.querySelector('#user-dropdown');
          const isExpanded = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', !isExpanded);
          if (dropdown) dropdown.hidden = isExpanded;
        });
      });

      // Global click closes dropdown
      document.addEventListener('click', () => {
        document.querySelectorAll('#user-dropdown').forEach(dropdown => {
          dropdown.hidden = true;
        });
        document.querySelectorAll('#user-menu-btn').forEach(btn => {
          btn.setAttribute('aria-expanded', 'false');
        });
      });

      // Logout handler
      document.querySelectorAll('#global-logout-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
            window.location.reload();
          } catch (err) {
            console.error('Failed to logout', err);
          }
        });
      });

    } else {
      window.CulinaryKing.currentUser = null;
      const loggedOutHtml = `
        <div class="auth-guest-links">
          <a href="login.html" class="auth-btn login-btn">LOG IN</a>
          <a href="signup.html" class="auth-btn signup-btn">SIGN UP</a>
        </div>
      `;
      authContainers.forEach(container => {
        container.innerHTML = loggedOutHtml;
      });
      authLinks.forEach(link => {
        if (!link.closest('[data-auth-container]')) {
          link.textContent = 'LOG IN';
          link.href = 'login.html';
        }
      });
    }
  } catch (error) {
    console.error('Error determining auth state:', error);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }
});
