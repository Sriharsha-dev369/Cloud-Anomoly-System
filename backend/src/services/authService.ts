import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../db/UserModel';

export const JWT_SECRET = process.env.JWT_SECRET ?? 'cloud-anomaly-secret';

const SALT_ROUNDS = 10;

export async function signup(email: string, password: string): Promise<{ token: string; userId: string }> {
  const existing = await UserModel.findOne({ email });
  if (existing) throw new Error('Email already registered');

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserModel.create({ email, password: hashed });

  const userId = (user._id as { toString(): string }).toString();
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '8h' });
  return { token, userId };
}

export async function login(email: string, password: string): Promise<{ token: string; userId: string }> {
  const user = await UserModel.findOne({ email });
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');

  const userId = (user._id as { toString(): string }).toString();
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '8h' });
  return { token, userId };
}
