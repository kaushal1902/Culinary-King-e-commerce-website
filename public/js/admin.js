// Admin Dashboard controller for Culinary King Operations
document.addEventListener('DOMContentLoaded', async () => {
  // State
  let storeStats = null;
  let allOrders = [];
  let allProducts = [];
  let currentOrderStatusFilter = 'all';

  // DOM Elements
  const toastContainer = document.getElementById('admin-toast-container');
  const sidebar = document.getElementById('admin-sidebar');
  const sidebarToggle = document.getElementById('admin-sidebar-toggle');
  const navTabs = document.querySelectorAll('.admin-nav-item');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  // KPI Elements
  const kpiRevenue = document.getElementById('kpi-revenue');
  const kpiOrders = document.getElementById('kpi-orders');
  const kpiPending = document.getElementById('kpi-pending');
  const kpiProducts = document.getElementById('kpi-products');
  const sidebarOrderCount = document.getElementById('sidebar-order-count');
  const sidebarProductCount = document.getElementById('sidebar-product-count');

  // Modals
  const productModal = document.getElementById('product-modal');
  const productModalTitle = document.getElementById('product-modal-title');
  const productForm = document.getElementById('product-form');
  const orderDetailModal = document.getElementById('order-detail-modal');
  const orderModalBody = document.getElementById('order-modal-body');
  const modalOrderNum = document.getElementById('modal-order-num');

  // Toast notification
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fa ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Check Admin Authorization
  async function checkAdminAuth() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!response.ok) {
        window.location.href = 'login.html?next=admin.html';
        return false;
      }
      const { user } = await response.json();
      if (!user || user.role !== 'admin') {
        alert('Access denied: Administrator privileges required.');
        window.location.href = 'index.html';
        return false;
      }
      const adminNameEl = document.getElementById('admin-user-name');
      if (adminNameEl) adminNameEl.textContent = user.name;
      return true;
    } catch (err) {
      console.error('Admin auth error:', err);
      return false;
    }
  }

  // Tab switching
  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      navTabs.forEach(b => b.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${tabId}`);
      if (targetContent) targetContent.classList.add('active');
      if (window.innerWidth < 992 && sidebar) sidebar.classList.remove('open');
    });
  });

  // Mobile sidebar toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Modal open/close handlers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.closeModal;
      const modal = document.getElementById(modalId);
      if (modal) modal.hidden = true;
    });
  });

  // Overview quick links
  document.getElementById('quick-add-product-btn')?.addEventListener('click', () => {
    openAddProductModal();
  });
  document.getElementById('open-add-product-modal-btn')?.addEventListener('click', () => {
    openAddProductModal();
  });
  document.getElementById('overview-view-all-orders')?.addEventListener('click', () => {
    document.querySelector('.admin-nav-item[data-tab="orders"]')?.click();
  });
  document.getElementById('refresh-orders-btn')?.addEventListener('click', () => {
    loadOrders();
    loadStats();
    showToast('Orders and stats refreshed.');
  });

  // Logout
  document.getElementById('admin-logout')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = 'index.html';
  });

  // -------------------------------------------------------------
  // STATS & KPIS
  // -------------------------------------------------------------
  async function loadStats() {
    try {
      const res = await fetch('/api/orders/admin/stats', { credentials: 'same-origin' });
      if (!res.ok) return;
      const { stats } = await res.json();
      storeStats = stats;

      if (kpiRevenue) kpiRevenue.textContent = `₹${(stats.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      if (kpiOrders) kpiOrders.textContent = stats.totalOrders || 0;
      if (kpiPending) kpiPending.textContent = (stats.placedOrders || 0) + (stats.processingOrders || 0);
      if (kpiProducts) kpiProducts.textContent = stats.totalProducts || 0;
      if (sidebarOrderCount) sidebarOrderCount.textContent = stats.totalOrders || 0;
      if (sidebarProductCount) sidebarProductCount.textContent = stats.totalProducts || 0;
    } catch (err) {
      console.error('Failed loading stats:', err);
    }
  }

  // -------------------------------------------------------------
  // ORDERS MANAGEMENT
  // -------------------------------------------------------------
  async function loadOrders() {
    try {
      const res = await fetch('/api/orders/admin/all', { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }
      const { orders } = await res.json();
      allOrders = orders || [];

      renderRecentOrdersTable();
      renderOrdersTable();
    } catch (err) {
      console.error('Failed loading orders:', err);
      showToast('Error loading orders.', 'error');
    }
  }

  function renderRecentOrdersTable() {
    const tbody = document.getElementById('recent-orders-tbody');
    if (!tbody) return;

    const recent = allOrders.slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No orders recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(order => `
      <tr>
        <td><strong class="text-primary">${escapeHtml(order.orderNumber)}</strong></td>
        <td>${formatDate(order.createdAt)}</td>
        <td>
          <strong>${escapeHtml(order.customer?.name || 'Customer')}</strong><br>
          <small class="text-muted">${escapeHtml(order.customer?.city || '')}</small>
        </td>
        <td>${order.items?.length || 0} item(s)</td>
        <td><strong>₹${(order.pricing?.total || 0).toFixed(2)}</strong></td>
        <td><span class="status-chip status-${(order.orderStatus || 'placed').toLowerCase()}">${(order.orderStatus || 'Placed').toUpperCase()}</span></td>
        <td>
          <button type="button" class="btn-sm-action" onclick="window.adminViewOrder('${order._id}')">
            <i class="fa fa-eye"></i> Details
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('all-orders-tbody');
    if (!tbody) return;

    const searchKeyword = document.getElementById('order-search-input')?.value.toLowerCase().trim() || '';

    const filtered = allOrders.filter(order => {
      // Filter by status tab
      if (currentOrderStatusFilter !== 'all' && (order.orderStatus || '').toLowerCase() !== currentOrderStatusFilter) {
        return false;
      }
      // Filter by search
      if (searchKeyword) {
        const orderNum = (order.orderNumber || '').toLowerCase();
        const custName = (order.customer?.name || '').toLowerCase();
        const custEmail = (order.customer?.email || '').toLowerCase();
        const custCity = (order.customer?.city || '').toLowerCase();
        return orderNum.includes(searchKeyword) || custName.includes(searchKeyword) || custEmail.includes(searchKeyword) || custCity.includes(searchKeyword);
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No orders match the current filter or search query.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(order => {
      const currentStatus = (order.orderStatus || 'placed').toLowerCase();
      const statusSelectHtml = `
        <select class="order-status-select status-${currentStatus}" onchange="window.adminUpdateOrderStatus('${order._id}', this.value)">
          <option value="placed" ${currentStatus === 'placed' ? 'selected' : ''}>Placed</option>
          <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>Processing</option>
          <option value="shipped" ${currentStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
          <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      `;

      return `
        <tr>
          <td>
            <strong class="text-primary">${escapeHtml(order.orderNumber)}</strong>
          </td>
          <td>${formatDate(order.createdAt)}</td>
          <td>
            <strong>${escapeHtml(order.customer?.name || 'Customer')}</strong><br>
            <small class="text-muted"><i class="fa fa-envelope-o"></i> ${escapeHtml(order.customer?.email || '')}</small><br>
            <small class="text-muted"><i class="fa fa-phone"></i> ${escapeHtml(order.customer?.phone || 'N/A')}</small>
          </td>
          <td>
            ${order.items?.map(i => `<div class="item-summary-line">${i.quantity}x ${escapeHtml(i.name)}</div>`).join('') || 'No items'}
          </td>
          <td>
            <strong>₹${(order.pricing?.total || 0).toFixed(2)}</strong><br>
            <small class="text-muted">Sub: ₹${(order.pricing?.subtotal || 0).toFixed(2)}</small>
          </td>
          <td>
            <span class="pay-chip ${order.payment?.status === 'paid' ? 'paid' : 'pending'}">${(order.payment?.method || 'Card').toUpperCase()} • ${(order.payment?.status || 'Paid').toUpperCase()}</span>
          </td>
          <td>
            <div class="status-action-wrap">
              ${statusSelectHtml}
              <button type="button" class="btn-sm-action" onclick="window.adminViewOrder('${order._id}')" title="View Full Details">
                <i class="fa fa-eye"></i> View
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Order status filter tabs
  document.querySelectorAll('#order-status-tabs .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#order-status-tabs .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentOrderStatusFilter = pill.dataset.status;
      renderOrdersTable();
    });
  });

  // Live order search
  document.getElementById('order-search-input')?.addEventListener('input', () => {
    renderOrdersTable();
  });

  // Global window method to update status
  window.adminUpdateOrderStatus = async function(orderId, newStatus) {
    try {
      const res = await fetch(`/api/orders/admin/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order status');

      showToast(`Order status updated to "${newStatus.toUpperCase()}".`);
      loadOrders();
      loadStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Global window method to view order details modal
  window.adminViewOrder = function(orderId) {
    const order = allOrders.find(o => o._id === orderId);
    if (!order || !orderDetailModal || !orderModalBody) return;

    modalOrderNum.textContent = order.orderNumber;

    const itemsRows = (order.items || []).map(i => `
      <div class="order-detail-item-row">
        <img src="${escapeHtml(i.image || 'images/char.jpg')}" alt="${escapeHtml(i.name)}">
        <div class="item-detail-info">
          <strong>${escapeHtml(i.name)}</strong>
          <small>Unit: ₹${(i.price || 0).toFixed(2)} × ${i.quantity}</small>
        </div>
        <strong>₹${(i.subtotal || 0).toFixed(2)}</strong>
      </div>
    `).join('');

    orderModalBody.innerHTML = `
      <div class="order-detail-grid">
        <div class="detail-box">
          <h4><i class="fa fa-user"></i> Customer & Shipping Address</h4>
          <p><strong>${escapeHtml(order.customer?.name)}</strong></p>
          <p>${escapeHtml(order.customer?.street)}<br>
          ${escapeHtml(order.customer?.city)}, ${escapeHtml(order.customer?.state)} ${escapeHtml(order.customer?.zip)}<br>
          ${escapeHtml(order.customer?.country || 'India')}</p>
          <p class="contact-line"><i class="fa fa-phone"></i> ${escapeHtml(order.customer?.phone || 'N/A')}</p>
          <p class="contact-line"><i class="fa fa-envelope-o"></i> ${escapeHtml(order.customer?.email)}</p>
          ${order.customer?.notes ? `<p class="order-notes-box"><strong>Notes:</strong> ${escapeHtml(order.customer.notes)}</p>` : ''}
        </div>

        <div class="detail-box">
          <h4><i class="fa fa-credit-card"></i> Payment & Pricing</h4>
          <p><strong>Payment Method:</strong> ${(order.payment?.method || 'Card').toUpperCase()}</p>
          <p><strong>Payment Status:</strong> ${(order.payment?.status || 'Paid').toUpperCase()}</p>
          <p><strong>Transaction Ref:</strong> <code>${escapeHtml(order.payment?.transactionId || 'N/A')}</code></p>
          <div class="pricing-summary-box">
            <div><span>Subtotal:</span> <span>₹${(order.pricing?.subtotal || 0).toFixed(2)}</span></div>
            <div><span>Shipping:</span> <span>₹${(order.pricing?.shippingFee || 0).toFixed(2)}</span></div>
            <div><span>Tax (5%):</span> <span>₹${(order.pricing?.tax || 0).toFixed(2)}</span></div>
            <div class="total-row"><span>Total:</span> <strong>₹${(order.pricing?.total || 0).toFixed(2)}</strong></div>
          </div>
        </div>
      </div>

      <div class="order-items-section">
        <h4>Items Ordered (${order.items?.length || 0})</h4>
        <div class="order-items-detail-list">
          ${itemsRows}
        </div>
      </div>
    `;

    orderDetailModal.hidden = false;
  };

  // -------------------------------------------------------------
  // PRODUCT CATALOG MANAGEMENT
  // -------------------------------------------------------------
  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const { products } = await res.json();
      allProducts = products || [];
      renderProductsTable();
    } catch (err) {
      console.error('Failed loading products:', err);
    }
  }

  function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    const searchKeyword = document.getElementById('product-search-input')?.value.toLowerCase().trim() || '';

    const filtered = allProducts.filter(prod => {
      if (!searchKeyword) return true;
      const name = (prod.name || '').toLowerCase();
      const cat = (prod.category || '').toLowerCase();
      return name.includes(searchKeyword) || cat.includes(searchKeyword);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No products found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(prod => `
      <tr>
        <td>
          <div class="prod-table-cell">
            <img src="${escapeHtml(prod.image || 'images/char.jpg')}" alt="${escapeHtml(prod.name)}" class="table-prod-img">
            <div>
              <strong>${escapeHtml(prod.name)}</strong>
              <small class="text-muted block">${escapeHtml(prod.slug || '')}</small>
            </div>
          </div>
        </td>
        <td><span class="category-chip">${escapeHtml(prod.category || 'Specialty')}</span></td>
        <td><strong>₹${(prod.price || 0).toFixed(2)}</strong></td>
        <td>${prod.salePrice ? `<strong class="text-primary">₹${prod.salePrice.toFixed(2)}</strong>` : '<span class="text-muted">—</span>'}</td>
        <td>
          <span class="stock-badge ${prod.stock < 5 ? 'stock-low' : 'stock-ok'}">${prod.stock || 0} in stock</span>
        </td>
        <td>
          ${prod.isOnSale ? '<span class="sale-chip">ON SALE</span>' : '<span class="text-muted">Standard</span>'}
        </td>
        <td>
          <div class="actions-cell">
            <button type="button" class="btn-icon-action btn-edit" onclick="window.adminEditProduct('${prod._id}')" title="Edit Product">
              <i class="fa fa-pencil"></i>
            </button>
            <button type="button" class="btn-icon-action btn-delete" onclick="window.adminDeleteProduct('${prod._id}', '${escapeHtml(prod.name)}')" title="Delete Product">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Live product search
  document.getElementById('product-search-input')?.addEventListener('input', () => {
    renderProductsTable();
  });

  function openAddProductModal() {
    if (!productModal || !productForm) return;
    productForm.reset();
    document.getElementById('prod-form-id').value = '';
    productModalTitle.innerHTML = '<i class="fa fa-plus-circle"></i> Add New Gourmet Product';
    document.getElementById('prod-image').value = 'images/char.jpg';
    document.getElementById('prod-stock').value = 25;
    productModal.hidden = false;
  }

  window.adminEditProduct = function(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product || !productModal || !productForm) return;

    productForm.reset();
    document.getElementById('prod-form-id').value = product._id;
    document.getElementById('prod-name').value = product.name || '';
    document.getElementById('prod-category').value = product.category || 'Artisan Cheese';
    document.getElementById('prod-stock').value = product.stock != null ? product.stock : 20;
    document.getElementById('prod-price').value = product.price != null ? product.price : '';
    document.getElementById('prod-sale-price').value = product.salePrice != null ? product.salePrice : '';
    document.getElementById('prod-image').value = product.image || 'images/char.jpg';
    document.getElementById('prod-desc').value = product.description || '';
    document.getElementById('prod-is-sale').checked = Boolean(product.isOnSale);

    productModalTitle.innerHTML = '<i class="fa fa-pencil"></i> Edit Product: ' + escapeHtml(product.name);
    productModal.hidden = false;
  };

  window.adminDeleteProduct = async function(productId, productName) {
    if (!confirm(`Are you sure you want to delete "${productName}" from the store catalog?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete product');

      showToast(`Product "${productName}" deleted successfully.`);
      loadProducts();
      loadStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Product Form Submission (Create / Update)
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('prod-form-id').value;
      const name = document.getElementById('prod-name').value.trim();
      const category = document.getElementById('prod-category').value.trim();
      const stock = parseInt(document.getElementById('prod-stock').value, 10);
      const price = parseFloat(document.getElementById('prod-price').value);
      const salePriceVal = document.getElementById('prod-sale-price').value.trim();
      const salePrice = salePriceVal ? parseFloat(salePriceVal) : undefined;
      const image = document.getElementById('prod-image').value.trim();
      const description = document.getElementById('prod-desc').value.trim();
      const isOnSale = document.getElementById('prod-is-sale').checked;

      if (!name || !description || isNaN(price)) {
        return showToast('Please fill out all required fields.', 'error');
      }

      const payload = {
        name,
        category,
        stock: isNaN(stock) ? 0 : stock,
        price,
        salePrice,
        image,
        description,
        isOnSale
      };

      const submitBtn = document.getElementById('save-product-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

      try {
        const url = id ? `/api/products/${id}` : '/api/products';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to save product');

        showToast(id ? 'Product updated successfully!' : 'Product added to catalog!');
        productModal.hidden = true;
        loadProducts();
        loadStats();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-save"></i> Save Product';
      }
    });
  }

  // Initial Load
  const isAuthed = await checkAdminAuth();
  if (isAuthed) {
    await loadStats();
    await loadOrders();
    await loadProducts();
  }
});
