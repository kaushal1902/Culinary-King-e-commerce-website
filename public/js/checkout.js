// Checkout controller for Culinary King
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('checkout-form');
  const alertBox = document.getElementById('checkout-alert');
  const submitBtn = document.getElementById('submit-order-btn');
  const itemsContainer = document.getElementById('review-items-list');
  const itemCountEl = document.getElementById('review-item-count');
  const subtotalEl = document.getElementById('review-subtotal');
  const shippingEl = document.getElementById('review-shipping');
  const taxEl = document.getElementById('review-tax');
  const totalEl = document.getElementById('review-total');
  const cardFields = document.getElementById('card-fields-container');
  const paymentOptions = document.querySelectorAll('.payment-option input[type="radio"]');

  let currentCart = null;

  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.hidden = false;
    alertBox.className = `checkout-alert-box alert-${type}`;
    alertBox.innerHTML = `<i class="fa ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> <span>${escapeHtml(message)}</span>`;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  // Handle payment method toggle
  paymentOptions.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
      radio.closest('.payment-option').classList.add('selected');
      if (cardFields) {
        cardFields.style.display = radio.value === 'credit_card' ? 'block' : 'none';
      }
    });
  });

  // Load User details if authenticated to auto-fill form
  async function loadUser() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (response.ok) {
        const { user } = await response.json();
        if (user) {
          const nameInput = document.getElementById('cust-name');
          const emailInput = document.getElementById('cust-email');
          if (nameInput && !nameInput.value) nameInput.value = user.name || '';
          if (emailInput && !emailInput.value) emailInput.value = user.email || '';
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Load cart summary
  async function loadCartSummary() {
    try {
      const response = await fetch('/api/cart', { credentials: 'same-origin' });
      if (response.status === 401) {
        window.location.href = 'login.html?next=checkout.html';
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load cart');

      currentCart = result.cart;
      if (!currentCart || currentCart.items.length === 0) {
        window.location.href = 'cart.html';
        return;
      }

      // Render items list
      itemsContainer.replaceChildren();
      currentCart.items.forEach(({ product, quantity, subtotal }) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'review-item-row';
        itemEl.innerHTML = `
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="review-item-img">
          <div class="review-item-info">
            <h4>${escapeHtml(product.name)}</h4>
            <small>Qty: ${quantity} × ₹${product.price.toFixed(2)}</small>
          </div>
          <strong class="review-item-price">₹${subtotal.toFixed(2)}</strong>
        `;
        itemsContainer.appendChild(itemEl);
      });

      const subtotal = currentCart.total || 0;
      const shipping = subtotal >= 999 ? 0 : 99;
      const tax = subtotal * 0.05;
      const total = subtotal + shipping + tax;

      itemCountEl.textContent = currentCart.itemCount;
      subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
      shippingEl.textContent = shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`;
      taxEl.textContent = `₹${tax.toFixed(2)}`;
      totalEl.textContent = `₹${total.toFixed(2)}`;

    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.hidden = true;

    const name = document.getElementById('cust-name').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const street = document.getElementById('cust-street').value.trim();
    const city = document.getElementById('cust-city').value.trim();
    const state = document.getElementById('cust-state').value.trim();
    const zip = document.getElementById('cust-zip').value.trim();
    const country = document.getElementById('cust-country').value.trim();
    const notes = document.getElementById('cust-notes').value.trim();
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'card';

    // Validation
    if (!name || !email || !phone || !street || !city || !zip) {
      return showAlert('Please fill out all required shipping fields (*).', 'error');
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return showAlert('Please enter a valid email address.', 'error');
    }

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing Gourmet Order...';

    try {
      const payload = {
        customer: { name, email, phone, street, city, state, zip, country, notes },
        paymentMethod
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to place order. Please try again.');
      }

      // Successful order
      const orderNumber = result.order?.orderNumber || 'Success';
      window.location.href = `orders.html?placed=${encodeURIComponent(orderNumber)}`;

    } catch (error) {
      showAlert(error.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  await loadUser();
  await loadCartSummary();
});
