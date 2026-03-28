import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import mongoose from 'mongoose';
import { seed } from './seed';

if (!process.env.MONGO_URI) {
  console.warn('[db] MONGO_URI not set — using localhost fallback');
}
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cloud-anomaly';

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('Atlas Connected');
  await seed();
}
