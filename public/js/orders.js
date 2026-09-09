// Order history viewer controller for Culinary King
document.addEventListener('DOMContentLoaded', async () => {
  const ordersList = document.getElementById('orders-list');
  const emptyState = document.getElementById('orders-empty');
  const loadingState = document.getElementById('orders-loading');
  const celebrationBanner = document.getElementById('order-success-banner');
  const placedOrderNum = document.getElementById('placed-order-num');

  // Check URL query parameters for freshly placed order
  const urlParams = new URLSearchParams(window.location.search);
  const newOrderParam = urlParams.get('placed');
  if (newOrderParam && celebrationBanner && placedOrderNum) {
    placedOrderNum.textContent = newOrderParam;
    celebrationBanner.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderOrderCard(order) {
    const card = document.createElement('article');
    card.className = 'order-history-card';

    const statusClass = `status-${(order.orderStatus || 'placed').toLowerCase()}`;
    const formattedDate = formatDate(order.createdAt);
    const subtotal = order.pricing?.subtotal || 0;
    const shipping = order.pricing?.shippingFee || 0;
    const tax = order.pricing?.tax || 0;
    const total = order.pricing?.total || 0;

    const itemsHtml = (order.items || []).map(item => `
      <div class="order-card-item-row">
        <img src="${escapeHtml(item.image || 'images/char.jpg')}" alt="${escapeHtml(item.name)}" class="order-item-thumb">
        <div class="order-item-desc">
          <h4>${escapeHtml(item.name)}</h4>
          <p class="order-item-unit">Qty: <strong>${item.quantity}</strong> × $${(item.price || 0).toFixed(2)}</p>
        </div>
        <div class="order-item-subtotal">
          <strong>$${(item.subtotal || 0).toFixed(2)}</strong>
        </div>
      </div>
    `).join('');

    const customer = order.customer || {};

    card.innerHTML = `
      <div class="order-card-header">
        <div class="order-meta-group">
          <div class="meta-unit">
            <span class="meta-label">ORDER PLACED</span>
            <strong class="meta-val">${formattedDate}</strong>
          </div>
          <div class="meta-unit">
            <span class="meta-label">ORDER NUMBER</span>
            <strong class="meta-val highlight-order-num">${escapeHtml(order.orderNumber)}</strong>
          </div>
          <div class="meta-unit">
            <span class="meta-label">SHIP TO</span>
            <strong class="meta-val" title="${escapeHtml(customer.street)}, ${escapeHtml(customer.city)}">${escapeHtml(customer.name)}</strong>
          </div>
        </div>
        <div class="order-badge-group">
          <span class="order-status-badge ${statusClass}">
            <i class="fa fa-circle"></i> ${(order.orderStatus || 'Placed').toUpperCase()}
          </span>
        </div>
      </div>

      <div class="order-card-body">
        <div class="order-items-column">
          <div class="order-items-list-box">
            ${itemsHtml}
          </div>
        </div>

        <div class="order-details-sidebar">
          <div class="detail-box">
            <h4><i class="fa fa-map-marker"></i> Delivery Address</h4>
            <p>${escapeHtml(customer.street)}<br>
            ${escapeHtml(customer.city)}, ${escapeHtml(customer.state || '')} ${escapeHtml(customer.zip)}<br>
            ${escapeHtml(customer.country || 'United States')}</p>
            <p class="contact-info"><i class="fa fa-phone"></i> ${escapeHtml(customer.phone || 'N/A')}</p>
          </div>

          <div class="detail-box">
            <h4><i class="fa fa-credit-card"></i> Payment & Cost</h4>
            <p class="pay-method"><i class="fa fa-check-circle text-success"></i> ${order.payment?.method === 'cod' ? 'Cash on Delivery' : 'Credit Card (Paid)'}</p>
            <div class="price-breakdown-mini">
              <div><span>Subtotal:</span> <span>$${subtotal.toFixed(2)}</span></div>
              <div><span>Shipping:</span> <span>${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span></div>
              <div><span>Tax (8%):</span> <span>$${tax.toFixed(2)}</span></div>
              <div class="grand-total-row"><span>Total Paid:</span> <strong>$${total.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;

    return card;
  }

  async function loadOrders() {
    try {
      const response = await fetch('/api/orders', { credentials: 'same-origin' });
      if (response.status === 401) {
        // If not logged in and not viewing a specific newly placed order
        if (!newOrderParam) {
          window.location.href = 'login.html?next=orders.html';
          return;
        }
      }

      if (!response.ok) {
        // If unauthenticated guest placed an order, attempt loading that specific order
        if (newOrderParam) {
          const guestRes = await fetch(`/api/orders/${encodeURIComponent(newOrderParam)}`, { credentials: 'same-origin' });
          if (guestRes.ok) {
            const { order } = await guestRes.json();
            if (order) {
              loadingState.hidden = true;
              ordersList.replaceChildren(renderOrderCard(order));
              return;
            }
          }
        }
        throw new Error('Unable to retrieve orders');
      }

      const { orders } = await response.json();
      loadingState.hidden = true;

      if (!orders || orders.length === 0) {
        if (emptyState) emptyState.hidden = false;
        return;
      }

      ordersList.replaceChildren(...orders.map(renderOrderCard));

    } catch (error) {
      loadingState.hidden = true;
      if (emptyState) emptyState.hidden = false;
      console.error('Error loading orders:', error);
    }
  }

  await loadOrders();
});
