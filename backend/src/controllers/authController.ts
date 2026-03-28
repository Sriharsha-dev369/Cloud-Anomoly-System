import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = 'cloud-anomaly-demo-secret';

const DEMO_USER = { username: 'admin', password: 'demo' };

export function postLogin(req: Request, res: Response): void {
  const { username, password } = req.body as { username?: string; password?: string };
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
}
