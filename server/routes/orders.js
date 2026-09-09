const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CK-${dateStr}-${randomSuffix}`;
}

// POST /api/orders - Create new order
router.post('/', optionalAuth, async (request, response, next) => {
  try {
    const { customer, paymentMethod, items: directItems } = request.body;

    if (!customer || !customer.name || !customer.email || !customer.street || !customer.city || !customer.zip) {
      return response.status(400).json({ message: 'Please complete all required customer shipping information.' });
    }

    let orderItems = [];

    // If direct items provided in body, use those; otherwise if user is logged in, pull from Cart
    if (Array.isArray(directItems) && directItems.length > 0) {
      for (const item of directItems) {
        let product = null;
        if (item.productId && mongoose.isValidObjectId(item.productId)) {
          product = await Product.findById(item.productId);
        } else if (item.slug) {
          product = await Product.findOne({ slug: item.slug });
        }

        const unitPrice = product
          ? (product.isOnSale && product.salePrice != null ? product.salePrice : product.price)
          : Number(item.price) || 0;

        const qty = Math.max(1, Number(item.quantity) || 1);

        orderItems.push({
          productId: product ? product._id : (mongoose.isValidObjectId(item.productId) ? item.productId : null),
          name: product ? product.name : (item.name || 'Artisanal Gourmet Item'),
          slug: product ? product.slug : (item.slug || ''),
          image: product ? product.image : (item.image || 'images/char.jpg'),
          price: unitPrice,
          quantity: qty,
          subtotal: Number((unitPrice * qty).toFixed(2))
        });
      }
    } else if (request.userId) {
      const cart = await Cart.findOne({ userId: request.userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        return response.status(400).json({ message: 'Your cart is empty. Add some products first!' });
      }

      orderItems = cart.items
        .filter(item => item.productId)
        .map(item => {
          const product = item.productId;
          const unitPrice = product.isOnSale && product.salePrice != null ? product.salePrice : product.price;
          return {
            productId: product._id,
            name: product.name,
            slug: product.slug,
            image: product.image,
            price: unitPrice,
            quantity: item.quantity,
            subtotal: Number((unitPrice * item.quantity).toFixed(2))
          };
        });
    }

    if (orderItems.length === 0) {
      return response.status(400).json({ message: 'No items in order.' });
    }

    const subtotal = Number(orderItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    const shippingFee = subtotal >= 100 ? 0 : 9.99;
    const tax = Number((subtotal * 0.08).toFixed(2)); // 8% sales tax
    const total = Number((subtotal + shippingFee + tax).toFixed(2));

    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      userId: request.userId || null,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone ? customer.phone.trim() : '',
        street: customer.street.trim(),
        city: customer.city.trim(),
        state: customer.state ? customer.state.trim() : '',
        zip: customer.zip.trim(),
        country: customer.country ? customer.country.trim() : 'United States',
        notes: customer.notes ? customer.notes.trim() : ''
      },
      items: orderItems,
      pricing: {
        subtotal,
        shippingFee,
        tax,
        discount: 0,
        total
      },
      payment: {
        method: ['credit_card', 'upi', 'cod', 'card'].includes(paymentMethod) ? paymentMethod : 'card',
        status: paymentMethod === 'cod' ? 'pending' : 'paid'
      },
      orderStatus: 'placed'
    });

    // Clear user cart if authenticated
    if (request.userId) {
      await Cart.findOneAndUpdate({ userId: request.userId }, { $set: { items: [] } });
    }

    return response.status(201).json({
      message: 'Order placed successfully!',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        pricing: order.pricing,
        payment: order.payment,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/orders - Get user's order history
router.get('/', requireAuth, async (request, response, next) => {
  try {
    const orders = await Order.find({ userId: request.userId }).sort({ createdAt: -1 });
    return response.json({ orders });
  } catch (error) {
    return next(error);
  }
});

// GET /api/orders/:id - Get specific order by ID or orderNumber
router.get('/:id', optionalAuth, async (request, response, next) => {
  try {
    const { id } = request.params;
    let query = {};
    if (mongoose.isValidObjectId(id)) {
      query._id = id;
    } else {
      query.orderNumber = id;
    }

    const order = await Order.findOne(query);
    if (!order) {
      return response.status(404).json({ message: 'Order not found.' });
    }

    // If order belongs to a user, verify access if user is logged in
    if (order.userId && request.userId && order.userId.toString() !== request.userId.toString()) {
      return response.status(403).json({ message: 'Access denied.' });
    }

    return response.json({ order });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
