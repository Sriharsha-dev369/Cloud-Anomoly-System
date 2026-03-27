import { Anomaly, Metric } from '../models/types';

export function detectAnomalies(metrics: Metric[]): Anomaly[] {
  if (metrics.length === 0) return [];

  const resourceId = metrics[0].resourceId;
  const last10 = metrics.slice(-10);

  const allLow = last10.length === 10 && last10.every((m) => m.cpu < 5);

  if (!allLow) return [];

  return [
    {
      resourceId,
      reason: 'low_usage',
      detectedAt: last10[last10.length - 1].timestamp,
    },
  ];
}
