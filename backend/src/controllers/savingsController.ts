import { Request, Response } from 'express';
import { calculateSavings } from '../services/savingsService';

export function getSavings(_req: Request, res: Response): void {
  res.json({ savings: calculateSavings() });
}
