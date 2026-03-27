import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  res.json(await generateMetrics(resourceId));
}
