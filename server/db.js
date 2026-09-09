const mongoose = require('mongoose');

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set in .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
}

module.exports = { connectDatabase };
