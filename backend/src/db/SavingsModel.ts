import mongoose, { Document, Schema } from 'mongoose';

export interface SavingsDocument extends Document {
  userId: string;
  resourceId: string;
  instanceType: string;
  costPerHour: number;
  stoppedAt: string;    // when the instance was stopped
  resumedAt?: string;   // set when instance restarts; absent = still saving
  savedAmount: number;  // finalized at resumption; 0 while still stopped
}

const SavingsSchema = new Schema<SavingsDocument>({
  userId:       { type: String, required: true, index: true },
  resourceId:   { type: String, required: true, index: true },
  instanceType: { type: String, required: true },
  costPerHour:  { type: Number, required: true },
  stoppedAt:    { type: String, required: true },
  resumedAt:    { type: String },
  savedAmount:  { type: Number, required: true, default: 0 },
});

export const SavingsModel = mongoose.model<SavingsDocument>('Savings', SavingsSchema);
