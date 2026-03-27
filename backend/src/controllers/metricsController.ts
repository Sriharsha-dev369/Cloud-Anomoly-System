import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';

export function getMetrics(_req: Request, res: Response): void {
  res.json(generateMetrics());
}
