import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

export async function connectDB() {
  await mongoose.connect(MONGODB_URI);
}

export async function ping() {
  await connectDB();
  // Verify connection is alive
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection not ready');
  }
}
