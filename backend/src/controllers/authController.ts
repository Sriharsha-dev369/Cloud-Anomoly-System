import { Request, Response } from 'express';
import { signup, login } from '../services/authService';

export async function postSignup(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const { token, userId } = await signup(email, password);
    res.status(201).json({ token, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    const status = message === 'Email already registered' ? 409 : 500;
    res.status(status).json({ error: message });
  }
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const { token, userId } = await login(email, password);
    res.json({ token, userId });
  } catch (err) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}
