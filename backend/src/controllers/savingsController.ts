import { Request, Response } from 'express';
import { calculateSavings } from '../services/savingsService';

export async function getSavings(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  res.json({ savings: await calculateSavings(resourceId) });
}
