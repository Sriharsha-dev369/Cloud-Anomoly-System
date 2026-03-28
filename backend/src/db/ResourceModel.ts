import mongoose, { Schema, Document } from 'mongoose';

export interface ResourceDocument extends Document {
  resourceId: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  stoppedAt?: string;
  startedAt?: string;
  instanceType?: string;
  userId?: string; // set for user-owned resources; absent for seeded demo resources
}

const ResourceSchema = new Schema<ResourceDocument>({
  resourceId:   { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  status:       { type: String, enum: ['running', 'stopped'], default: 'running' },
  costPerHour:  { type: Number, required: true },
  stoppedAt:    { type: String },
  startedAt:    { type: String },
  instanceType: { type: String },
  userId:       { type: String, index: true },
});

export const ResourceModel = mongoose.model<ResourceDocument>('Resource', ResourceSchema);
