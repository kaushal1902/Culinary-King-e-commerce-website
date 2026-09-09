// Shopping cart manager for Culinary King
document.addEventListener('DOMContentLoaded', async () => {
  const list = document.querySelector('[data-cart-items]');
  const emptyState = document.querySelector('[data-cart-empty]');
  const contentGrid = document.getElementById('cart-content-grid');
  const countEls = document.querySelectorAll('[data-cart-count]');
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const shippingEl = document.querySelector('[data-cart-shipping]');
  const taxEl = document.querySelector('[data-cart-tax]');
  const totalEl = document.querySelector('[data-cart-total]');
  const messageBox = document.querySelector('[data-cart-message]');
  const shippingFill = document.getElementById('shipping-progress-fill');
  const shippingHint = document.getElementById('shipping-hint-text');

  function showMessage(text, isError = false) {
    if (!messageBox) return;
    messageBox.hidden = false;
    messageBox.className = `cart-message-box ${isError ? 'cart-msg-error' : 'cart-msg-success'}`;
    messageBox.innerHTML = `<i class="fa ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${escapeHtml(text)}`;
    setTimeout(() => {
      messageBox.hidden = true;
    }, 4000);
  }

  function escapeHtml(value) {
    if (!value) return '';
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function render(cart) {
    const hasItems = cart.items && cart.items.length > 0;
    
    // Update badge counts everywhere
    countEls.forEach(el => el.textContent = cart.itemCount || 0);

    if (!hasItems) {
      if (emptyState) emptyState.hidden = false;
      if (contentGrid) contentGrid.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (contentGrid) contentGrid.hidden = false;

    // Calculate pricing values
    const subtotal = cart.total || 0;
    const isFreeShipping = subtotal >= 100;
    const shipping = isFreeShipping ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = isFreeShipping ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    // Update free shipping meter
    if (shippingFill && shippingHint) {
      const percentage = Math.min(100, Math.round((subtotal / 100) * 100));
      shippingFill.style.width = `${percentage}%`;
      if (isFreeShipping) {
        shippingHint.innerHTML = '🎉 You qualified for <strong>FREE Shipping</strong>!';
      } else {
        const remaining = (100 - subtotal).toFixed(2);
        shippingHint.innerHTML = `Add <strong>$${remaining}</strong> more to unlock <strong>FREE Shipping</strong>!`;
      }
    }

    // Render items list
    list.replaceChildren();
    cart.items.forEach(({ product, quantity, subtotal }) => {
      const itemEl = document.createElement('article');
      itemEl.className = 'cart-item-row';
      itemEl.innerHTML = `
        <div class="cart-item-info">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="cart-item-thumb">
          <div class="cart-item-details">
            <h3 class="cart-item-title">${escapeHtml(product.name)}</h3>
            <p class="cart-item-unit-price">$${product.price.toFixed(2)} each</p>
            <button type="button" class="btn-remove-item" data-remove="${product.id}" title="Remove item">
              <i class="fa fa-trash"></i> Remove
            </button>
          </div>
        </div>

        <div class="cart-item-qty-cell">
          <div class="qty-stepper">
            <button type="button" class="qty-btn" data-step="-1" data-product-id="${product.id}">-</button>
            <input type="number" min="1" max="99" value="${quantity}" class="qty-input" data-quantity="${product.id}">
            <button type="button" class="qty-btn" data-step="1" data-product-id="${product.id}">+</button>
          </div>
        </div>

        <div class="cart-item-subtotal-cell">
          <strong class="item-subtotal-val">$${subtotal.toFixed(2)}</strong>
        </div>
      `;
      list.appendChild(itemEl);
    });
  }

  async function loadCart() {
    try {
      const response = await fetch('/api/cart', { credentials: 'same-origin' });
      if (response.status === 401) {
        window.location.href = 'login.html?next=cart.html';
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load cart.');
      render(result.cart);
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  // Handle quantity stepper buttons & input changes
  if (list) {
    list.addEventListener('click', async (event) => {
      // Handle remove button
      const removeBtn = event.target.closest('[data-remove]');
      if (removeBtn) {
        try {
          const productId = removeBtn.dataset.remove;
          const response = await fetch(`/api/cart/items/${productId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          const result = await response.json();
          if (!response.ok) return showMessage(result.message, true);
          showMessage('Item removed from cart.');
          render(result.cart);
        } catch (err) {
          showMessage('Failed to remove item.', true);
        }
        return;
      }

      // Handle stepper + / - buttons
      const stepBtn = event.target.closest('.qty-btn');
      if (stepBtn) {
        const productId = stepBtn.dataset.productId;
        const step = parseInt(stepBtn.dataset.step, 10);
        const input = stepBtn.parentElement.querySelector('.qty-input');
        if (!input) return;

        let currentQty = parseInt(input.value, 10) || 1;
        let newQty = currentQty + step;
        if (newQty < 1) newQty = 1;
        if (newQty > 99) newQty = 99;

        if (newQty === currentQty) return;
        input.value = newQty;

        try {
          const response = await fetch(`/api/cart/items/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ quantity: newQty })
          });
          const result = await response.json();
          if (!response.ok) {
            input.value = currentQty;
            return showMessage(result.message, true);
          }
          render(result.cart);
        } catch (err) {
          input.value = currentQty;
          showMessage('Failed to update quantity.', true);
        }
      }
    });

    list.addEventListener('change', async (event) => {
      if (!event.target.matches('[data-quantity]')) return;
      const productId = event.target.dataset.quantity;
      const newQty = parseInt(event.target.value, 10);
      if (isNaN(newQty) || newQty < 1 || newQty > 99) {
        event.target.value = 1;
      }

      try {
        const response = await fetch(`/api/cart/items/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ quantity: parseInt(event.target.value, 10) })
        });
        const result = await response.json();
        if (!response.ok) return showMessage(result.message, true);
        showMessage('Cart updated.');
        render(result.cart);
      } catch (err) {
        showMessage('Failed to update quantity.', true);
      }
    });
  }

  await loadCart();
});
