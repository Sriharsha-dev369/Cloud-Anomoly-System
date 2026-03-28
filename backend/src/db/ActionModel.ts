import mongoose, { Document, Schema } from 'mongoose';

export interface ActionDocument extends Document {
  userId: string;
  resourceId: string;
  action: 'stop' | 'restart';
  status: 'completed' | 'failed';
  timestamp: string;
}

const ActionSchema = new Schema<ActionDocument>({
  userId:     { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  action:     { type: String, enum: ['stop', 'restart'], required: true },
  status:     { type: String, enum: ['completed', 'failed'], required: true },
  timestamp:  { type: String, required: true },
});

export const ActionModel = mongoose.model<ActionDocument>('Action', ActionSchema);
