import mongoose, { Schema, Document } from 'mongoose';

export interface LogDocument extends Document {
  timestamp: string;
  resourceId: string;
  type: 'anomaly' | 'action';
  message: string;
}

const LogSchema = new Schema<LogDocument>({
  timestamp:  { type: String, required: true },
  resourceId: { type: String, required: true },
  type:       { type: String, enum: ['anomaly', 'action'], required: true },
  message:    { type: String, required: true },
});

export const LogModel = mongoose.model<LogDocument>('Log', LogSchema);
