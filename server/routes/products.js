const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET /api/products - List products (filter by category if requested)
router.get('/', async (request, response, next) => {
  try {
    const filter = request.query.category ? { category: request.query.category } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return response.json({ products });
  } catch (error) {
    return next(error);
  }
});

// GET /api/products/:slug - Get single product
router.get('/:slug', async (request, response, next) => {
  try {
    let query = { slug: request.params.slug };
    if (mongoose.isValidObjectId(request.params.slug)) {
      query = { $or: [{ slug: request.params.slug }, { _id: request.params.slug }] };
    }
    const product = await Product.findOne(query);
    if (!product) return response.status(404).json({ message: 'Product not found.' });
    return response.json({ product });
  } catch (error) {
    return next(error);
  }
});

// POST /api/products - Add new product (Admin)
router.post('/', requireAdmin, async (request, response, next) => {
  try {
    const { name, description, category, price, salePrice, image, stock, isOnSale } = request.body;

    if (!name || !description || !category || price == null) {
      return response.status(400).json({ message: 'Name, description, category, and price are required.' });
    }

    let slug = request.body.slug ? slugify(request.body.slug) : slugify(name);
    
    // Ensure slug uniqueness
    const existing = await Product.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const product = await Product.create({
      name: name.trim(),
      slug,
      description: description.trim(),
      category: category.trim(),
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : undefined,
      image: image ? image.trim() : 'images/char.jpg',
      stock: stock != null ? Number(stock) : 20,
      isOnSale: Boolean(isOnSale)
    });

    return response.status(201).json({ message: 'Product created successfully!', product });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/products/:id - Update product (Admin)
router.put('/:id', requireAdmin, async (request, response, next) => {
  try {
    const { id } = request.params;
    if (!mongoose.isValidObjectId(id)) {
      return response.status(400).json({ message: 'Invalid product ID.' });
    }

    const { name, slug, description, category, price, salePrice, image, stock, isOnSale } = request.body;

    const product = await Product.findById(id);
    if (!product) {
      return response.status(404).json({ message: 'Product not found.' });
    }

    if (name) product.name = name.trim();
    if (slug) product.slug = slugify(slug);
    if (description) product.description = description.trim();
    if (category) product.category = category.trim();
    if (price != null) product.price = Number(price);
    if (salePrice !== undefined) product.salePrice = salePrice ? Number(salePrice) : null;
    if (image) product.image = image.trim();
    if (stock != null) product.stock = Number(stock);
    if (isOnSale !== undefined) product.isOnSale = Boolean(isOnSale);

    await product.save();
    return response.json({ message: 'Product updated successfully!', product });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/products/:id - Delete product (Admin)
router.delete('/:id', requireAdmin, async (request, response, next) => {
  try {
    const { id } = request.params;
    if (!mongoose.isValidObjectId(id)) {
      return response.status(400).json({ message: 'Invalid product ID.' });
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return response.status(404).json({ message: 'Product not found.' });
    }

    return response.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
