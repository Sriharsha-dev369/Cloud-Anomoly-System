import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { getCachedMetrics, setCachedMetrics } from '../services/syncEngine';
import { isAwsMode } from '../utils/awsConfig';

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const source = req.query.source as string | undefined;
  const since = req.query.since as string | undefined;
  const userId = req.userId;

  const isMock = source === 'mock' || !isAwsMode();

  // Use syncEngine cache when available, BUT only for AWS mode.
  // Mock mode generates dynamic metrics instantly, so caching it just artificially freezes the chart.
  if (resourceId && !isMock) {
    const cached = getCachedMetrics(resourceId);
    if (cached) {
      const result = since
        ? cached.filter((m) => new Date(m.timestamp).getTime() > new Date(since).getTime())
        : cached;
      res.json(result);
      return;
    }
  }

  const generated = await generateMetrics(resourceId, source, since, userId);

  // If a cache miss forced us to fetch from AWS, and we fetched the full window (since=undefined),
  // proactively cache the result to protect CloudWatch from the next 80 seconds of 10s-polling!
  if (resourceId && !isMock && !since) {
    setCachedMetrics(resourceId, generated);
  }

  res.json(generated);
}
