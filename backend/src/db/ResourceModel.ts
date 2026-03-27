import mongoose, { Schema, Document } from 'mongoose';

export interface ResourceDocument extends Document {
  resourceId: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  stoppedAt?: string;
}

const ResourceSchema = new Schema<ResourceDocument>({
  resourceId:  { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  status:      { type: String, enum: ['running', 'stopped'], default: 'running' },
  costPerHour: { type: Number, required: true },
  stoppedAt:   { type: String },
});

export const ResourceModel = mongoose.model<ResourceDocument>('Resource', ResourceSchema);
