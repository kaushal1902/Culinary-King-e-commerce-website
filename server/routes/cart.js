const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function loadCart(userId) {
  const cart = await Cart.findOne({ userId }).populate('items.productId');
  return cart || { items: [] };
}

function serializeCart(cart) {
  const items = cart.items
    .filter((item) => item.productId)
    .map((item) => {
      const product = item.productId;
      const unitPrice = product.isOnSale && product.salePrice != null ? product.salePrice : product.price;
      return {
        product: {
          id: product._id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          stock: product.stock,
          price: unitPrice
        },
        quantity: item.quantity,
        subtotal: unitPrice * item.quantity
      };
    });

  return {
    items,
    total: items.reduce((total, item) => total + item.subtotal, 0),
    itemCount: items.reduce((count, item) => count + item.quantity, 0)
  };
}

router.get('/', async (request, response, next) => {
  try {
    return response.json({ cart: serializeCart(await loadCart(request.userId)) });
  } catch (error) {
    return next(error);
  }
});

router.post('/items', async (request, response, next) => {
  try {
    const { slug, quantity = 1 } = request.body;
    const requestedQuantity = Number(quantity);
    const product = await Product.findOne({ slug });

    if (!product) return response.status(404).json({ message: 'Product not found.' });
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 99) {
      return response.status(400).json({ message: 'Quantity must be a whole number between 1 and 99.' });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: request.userId },
      { $setOnInsert: { userId: request.userId } },
      { new: true, upsert: true }
    );
    const existingItem = cart.items.find((item) => item.productId.toString() === product._id.toString());
    const nextQuantity = (existingItem ? existingItem.quantity : 0) + requestedQuantity;

    if (nextQuantity > product.stock) {
      return response.status(400).json({ message: `Only ${product.stock} item(s) are currently in stock.` });
    }

    if (existingItem) existingItem.quantity = nextQuantity;
    else cart.items.push({ productId: product._id, quantity: requestedQuantity });
    await cart.save();

    return response.status(201).json({ cart: serializeCart(await loadCart(request.userId)) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/items/:productId', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.productId)) {
      return response.status(400).json({ message: 'Invalid product.' });
    }

    const quantity = Number(request.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return response.status(400).json({ message: 'Quantity must be a whole number between 1 and 99.' });
    }

    const product = await Product.findById(request.params.productId);
    const cart = await Cart.findOne({ userId: request.userId });
    const item = cart?.items.find((cartItem) => cartItem.productId.toString() === request.params.productId);
    if (!product || !cart || !item) return response.status(404).json({ message: 'Cart item not found.' });
    if (quantity > product.stock) return response.status(400).json({ message: `Only ${product.stock} item(s) are currently in stock.` });

    item.quantity = quantity;
    await cart.save();
    return response.json({ cart: serializeCart(await loadCart(request.userId)) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/items/:productId', async (request, response, next) => {
  try {
    const cart = await Cart.findOne({ userId: request.userId });
    if (!cart) return response.json({ cart: serializeCart({ items: [] }) });
    cart.items = cart.items.filter((item) => item.productId.toString() !== request.params.productId);
    await cart.save();
    return response.json({ cart: serializeCart(await loadCart(request.userId)) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/', async (request, response, next) => {
  try {
    await Cart.findOneAndUpdate({ userId: request.userId }, { $set: { items: [] } }, { upsert: true });
    return response.json({ cart: serializeCart({ items: [] }) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
