// Enhanced site-wide interactions and product loader
document.addEventListener('DOMContentLoaded', async () => {
  const cartCounts = document.querySelectorAll('[data-cart-count]');

  function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fa ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
      </div>
      <a href="cart.html" class="toast-action">View Cart</a>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function renderProductCard(product) {
    const item = document.createElement('div');
    item.className = 'item product-card';

    const unitPrice = product.isOnSale && product.salePrice != null ? product.salePrice : product.price;
    const oldPrice = product.isOnSale && product.salePrice != null ? product.price : null;

    item.innerHTML = `
      <div class="item_img">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${product.isOnSale ? '<span class="sale-badge">SALE</span>' : ''}
      </div>
      <div class="item_content">
        <div class="product-category-tag">${product.category || 'Gourmet Specialty'}</div>
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <div class="price-container">
          <span class="current-price">$${unitPrice.toFixed(2)}</span>
          ${oldPrice ? `<span class="original-price">$${oldPrice.toFixed(2)}</span>` : ''}
        </div>
        <button type="button" class="add-to-cart" data-add-to-cart="${product.slug}" data-product-name="${product.name}">
          <i class="fa fa-shopping-basket"></i> ADD TO CART
        </button>
      </div>
    `;
    return item;
  }

  async function loadProducts() {
    const productList = document.querySelector('[data-product-list]');
    if (!productList) return;
    try {
      const response = await fetch('/api/products');
      if (!response.ok) return;
      const { products } = await response.json();
      if (products && products.length > 0) {
        productList.replaceChildren(...products.map(renderProductCard));
      }
    } catch (error) {
      console.error('Unable to load dynamic products.', error);
    }
  }

  function attachAddButtons() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-add-to-cart]');
      if (!button) return;

      const slug = button.dataset.addToCart;
      const productName = button.dataset.productName || 'Item';
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Adding...';

      try {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ slug, quantity: 1 })
        });

        const result = await response.json();

        if (response.status === 401) {
          // If not logged in, prompt or redirect to login
          window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        if (!response.ok) {
          throw new Error(result.message || 'Unable to add item to cart.');
        }

        button.innerHTML = '<i class="fa fa-check"></i> Added!';
        cartCounts.forEach(el => {
          el.textContent = result.cart.itemCount;
        });

        showToast(`Added <strong>${productName}</strong> to your cart!`, 'success');

        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 1500);
      } catch (error) {
        button.innerHTML = 'Error';
        showToast(error.message, 'error');
        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 2000);
      }
    });
  }

  await loadProducts();
  attachAddButtons();
});
