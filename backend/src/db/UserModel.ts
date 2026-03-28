import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  createdAt: Date;
  // AWS credentials — secret key stored encrypted, never exposed in responses
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string; // encrypted via AES-256-GCM
  awsRegion?: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  awsAccessKeyId: { type: String },
  awsSecretAccessKey: { type: String },
  awsRegion: { type: String },
});

export const UserModel = mongoose.model<IUser>('User', userSchema);
