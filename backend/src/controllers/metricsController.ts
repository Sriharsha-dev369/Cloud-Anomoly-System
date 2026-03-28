import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { getCachedMetrics } from '../services/syncEngine';

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const source = req.query.source as string | undefined;
  const since = req.query.since as string | undefined;

  if (process.env.DATA_SOURCE === 'aws' && resourceId) {
    const cached = getCachedMetrics(resourceId);
    if (cached) {
      const result = since
        ? cached.filter((m) => new Date(m.timestamp).getTime() > new Date(since).getTime())
        : cached;
      res.json(result);
      return;
    }
  }

  res.json(await generateMetrics(resourceId, source, since));
}
