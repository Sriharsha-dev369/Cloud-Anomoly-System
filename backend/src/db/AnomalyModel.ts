import mongoose, { Document, Schema } from 'mongoose';

export interface AnomalyDocument extends Document {
  userId: string;
  resourceId: string;
  type: 'low_usage' | 'spike_usage';
  confidence: number;
  detectedAt: string;
  ruleTriggered?: boolean;
  mlTriggered?: boolean;
  anomalyScore?: number;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  reason?: string;
}

const AnomalySchema = new Schema<AnomalyDocument>({
  userId:     { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  type:       { type: String, enum: ['low_usage', 'spike_usage'], required: true },
  confidence: { type: Number, required: true },
  detectedAt: { type: String, required: true },
  ruleTriggered:   { type: Boolean, required: false },
  mlTriggered:     { type: Boolean, required: false },
  anomalyScore:    { type: Number, required: false },
  confidenceLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: false },
  reason:          { type: String, required: false },
});

export const AnomalyModel = mongoose.model<AnomalyDocument>('Anomaly', AnomalySchema);
