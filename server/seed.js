require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const { connectDatabase } = require('./db');

const products = [
  {
    name: 'The Charcuterie Collection',
    slug: 'charcuterie-collection',
    description: 'A carefully selected collection for charcuterie lovers.',
    category: 'Cured Meats',
    price: 89.99,
    salePrice: 69.99,
    isOnSale: true,
    image: 'images/char.jpg',
    stock: 25
  },
  {
    name: 'Soft Pretzel Pairing Club',
    slug: 'pretzel-pairing-club',
    description: 'The ultimate Philly pretzel experience, delivered monthly.',
    category: 'Specialty Foods',
    price: 49.99,
    image: 'images/bacon.jpg',
    stock: 30
  },
  {
    name: 'Hot Sauce Gift Box',
    slug: 'hot-sauce-gift-box',
    description: 'A fiery, flavor-filled quintet for adventurous heat lovers.',
    category: 'Specialty Foods',
    price: 34.99,
    image: 'images/hot.jpg',
    stock: 40
  },
  {
    name: 'Appetizing Cakes',
    slug: 'appetizing-cakes',
    description: 'Delicious cakes made for celebrations and sweet cravings.',
    category: 'Cakes',
    price: 44.99,
    image: 'images/cake.jpg',
    stock: 20
  }
];

async function seed() {
  await connectDatabase();
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
