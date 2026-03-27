import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';

export function getMetrics(req: Request, res: Response): void {
  const resourceId = req.query.resourceId as string | undefined;
  res.json(generateMetrics(resourceId));
}
