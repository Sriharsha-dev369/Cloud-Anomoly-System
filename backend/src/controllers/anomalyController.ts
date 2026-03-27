import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { detectAnomalies } from '../services/anomalyService';

export function getAnomalies(_req: Request, res: Response): void {
  const metrics = generateMetrics();
  res.json(detectAnomalies(metrics));
}
