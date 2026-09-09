require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const authRoutes = require('./server/routes/auth');
const productRoutes = require('./server/routes/products');
const cartRoutes = require('./server/routes/cart');
const orderRoutes = require('./server/routes/orders');

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientRoot = __dirname;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(clientRoot));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.use('/api', (error, request, response, next) => {
  if (error) return next(error);
  return next();
});

app.use((error, request, response, next) => {
  console.error(error);
  return response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URI and JWT_SECRET must be set in .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`Culinary King running at http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(`Unable to start server: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { app };
