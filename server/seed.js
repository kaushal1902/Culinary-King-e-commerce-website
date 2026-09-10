require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('./models/Product');
const User = require('./models/User');
const { connectDatabase } = require('./db');

const products = [
  {
    name: 'The Charcuterie Collection',
    slug: 'charcuterie-collection',
    description: 'A carefully selected collection for charcuterie lovers.',
    category: 'Cured Meats',
    price: 1899,
    salePrice: 1499,
    isOnSale: true,
    image: 'images/char.jpg',
    stock: 25
  },
  {
    name: 'Soft Pretzel Pairing Club',
    slug: 'pretzel-pairing-club',
    description: 'The ultimate Philly pretzel experience, delivered monthly.',
    category: 'Specialty Foods',
    price: 899,
    image: 'images/bacon.jpg',
    stock: 30
  },
  {
    name: 'Hot Sauce Gift Box',
    slug: 'hot-sauce-gift-box',
    description: 'A fiery, flavor-filled quintet for adventurous heat lovers.',
    category: 'Specialty Foods',
    price: 699,
    image: 'images/hot.jpg',
    stock: 40
  },
  {
    name: 'Appetizing Cakes',
    slug: 'appetizing-cakes',
    description: 'Delicious cakes made for celebrations and sweet cravings.',
    category: 'Cakes',
    price: 999,
    image: 'images/cake.jpg',
    stock: 20
  }
];

async function seed() {
  await connectDatabase();

  // Seed Products
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products with INR (₹) prices.`);

  // Seed / Upsert Strict Default Admin User
  const adminEmail = 'admin@culinaryking.com';
  const adminPassword = 'admin1234';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        name: 'Culinary King Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin'
      }
    },
    { upsert: true, new: true }
  );

  console.log(`Default Admin Account Ready:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
