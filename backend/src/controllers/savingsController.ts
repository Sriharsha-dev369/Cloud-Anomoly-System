import { Request, Response } from 'express';
import { calculateSavings } from '../services/savingsService';

export function getSavings(req: Request, res: Response): void {
  const resourceId = req.query.resourceId as string | undefined;
  res.json({ savings: calculateSavings(resourceId) });
}
