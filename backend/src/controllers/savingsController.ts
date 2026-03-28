import { Request, Response } from 'express';
import { calculateSavings } from '../services/savingsService';
import { getUserTotalSavings } from '../repositories/savingsRepository';

export async function getSavings(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const userId = req.userId!;

  if (resourceId) {
    // Single resource: live savings computed from stoppedAt (existing behaviour).
    res.json({ savings: await calculateSavings(resourceId, userId) });
    return;
  }

  // No resourceId: return user's total accumulated savings from DB.
  res.json({ savings: await getUserTotalSavings(userId) });
}
