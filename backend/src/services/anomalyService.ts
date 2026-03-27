import { Anomaly, Metric } from '../models/types';

const LOW_CPU_THRESHOLD = 5;   // %
const HIGH_CPU_THRESHOLD = 90; // %
const WINDOW = 10;             // consecutive minutes

export function detectAnomalies(metrics: Metric[]): Anomaly[] {
  if (metrics.length === 0) return [];

  const resourceId = metrics[0].resourceId;
  const last10 = metrics.slice(-WINDOW);
  if (last10.length < WINDOW) return [];

  const detectedAt = last10[last10.length - 1].timestamp;

  // low_usage: CPU < 5% for 10 mins AND cost is still increasing (not flat/stopped)
  const allLow = last10.every((m) => m.cpu < LOW_CPU_THRESHOLD);
  if (allLow) {
    const costs = last10.map((m) => m.cost);
    const costIncreasing = costs[costs.length - 1] > costs[0];
    if (costIncreasing) {
      return [{ resourceId, reason: 'low_usage', detectedAt }];
    }
  }

  // spike_usage: CPU > 90% for 10 consecutive mins
  const allHigh = last10.every((m) => m.cpu > HIGH_CPU_THRESHOLD);
  if (allHigh) {
    return [{ resourceId, reason: 'spike_usage', detectedAt }];
  }

  return [];
}
