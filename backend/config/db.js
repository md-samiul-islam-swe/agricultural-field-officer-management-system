const mongoose = require('mongoose');

async function connectDB() {
  const { MONGO_URI } = process.env;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not configured. Add it to backend/.env.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
