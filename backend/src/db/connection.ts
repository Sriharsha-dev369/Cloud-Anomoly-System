import mongoose from 'mongoose';
import { ResourceModel } from './ResourceModel';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cloud-anomaly';

const seedResources = [
  { resourceId: 'res-001', name: 'web-server-01',  status: 'running', costPerHour: 0.50 },
  { resourceId: 'res-002', name: 'api-gateway-01', status: 'running', costPerHour: 1.20 },
  { resourceId: 'res-003', name: 'db-replica-01',  status: 'running', costPerHour: 0.80 },
  { resourceId: 'res-004', name: 'worker-node-01', status: 'running', costPerHour: 0.30 },
  { resourceId: 'res-005', name: 'ml-training-01', status: 'running', costPerHour: 2.50 },
];

async function seed(): Promise<void> {
  const count = await ResourceModel.countDocuments();
  if (count === 0) {
    await ResourceModel.insertMany(seedResources);
    console.log('Seeded resources');
  }
}

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('Atlas Connected');
  await seed();
}
