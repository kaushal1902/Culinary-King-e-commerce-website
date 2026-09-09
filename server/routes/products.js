const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

router.get('/', async (request, response, next) => {
  try {
    const filter = request.query.category ? { category: request.query.category } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return response.json({ products });
  } catch (error) {
    return next(error);
  }
});

router.get('/:slug', async (request, response, next) => {
  try {
    const product = await Product.findOne({ slug: request.params.slug });
    if (!product) return response.status(404).json({ message: 'Product not found.' });
    return response.json({ product });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
