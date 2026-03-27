import { Metric } from '../models/types';
import { getResource, getRestartedAt } from '../store/inMemoryStore';

// Each resource gets a distinct CPU behaviour for demo clarity
const patterns: Record<string, { normalMin: number; normalMax: number; dropAt: number; dropMax: number }> = {
  'res-001': { normalMin: 70, normalMax: 85, dropAt: 20, dropMax: 2  }, // drops last 20 min
  'res-002': { normalMin: 60, normalMax: 80, dropAt:  0, dropMax: 75 }, // healthy all 60 min (no anomaly)
  'res-003': { normalMin: 75, normalMax: 90, dropAt: 30, dropMax: 2  }, // drops last 30 min
  'res-004': { normalMin: 65, normalMax: 78, dropAt: 15, dropMax: 2  }, // drops last 15 min
};

const defaultPattern = { normalMin: 65, normalMax: 80, dropAt: 20, dropMax: 2 };

// Minutes of normal CPU shown after restart before the drop pattern returns
const RECOVERY_MINUTES = 1;

export function generateMetrics(resourceId?: string): Metric[] {
  const resource = getResource(resourceId);
  const pattern = patterns[resource.id] ?? defaultPattern;
  const metrics: Metric[] = [];
  const now = Date.now();

  const restartedAt = getRestartedAt(resource.id);
  const minutesSinceRestart = restartedAt
    ? (now - new Date(restartedAt).getTime()) / 60_000
    : null;
  const inRecovery = minutesSinceRestart !== null && minutesSinceRestart < RECOVERY_MINUTES;

  const stoppedAtMs = resource.stoppedAt ? new Date(resource.stoppedAt).getTime() : null;

  // Cost value at the moment of stop: how far into the 60-min window the stop occurred
  const windowStartMs = now - 59 * 60 * 1000;
  const costAtStop = stoppedAtMs
    ? parseFloat((resource.costPerHour * (Math.max(0, stoppedAtMs - windowStartMs) / (60 * 60 * 1000))).toFixed(4))
    : null;

  for (let i = 59; i >= 0; i--) {
    const pointMs = now - i * 60 * 1000;
    const timestamp = new Date(pointMs).toISOString();
    const isStopped = stoppedAtMs !== null && pointMs >= stoppedAtMs;

    let cpu: number;
    let cost: number;

    if (isStopped) {
      cpu = parseFloat((Math.random() * 2).toFixed(1));
      cost = costAtStop!;
    } else {
      const inDrop = !inRecovery && i <= pattern.dropAt;
      cpu = inDrop
        ? Math.random() * pattern.dropMax
        : pattern.normalMin + Math.random() * (pattern.normalMax - pattern.normalMin);
      cost = parseFloat((resource.costPerHour * ((60 - i) / 60)).toFixed(4));
    }

    metrics.push({ resourceId: resource.id, timestamp, cpu: parseFloat(cpu.toFixed(1)), cost });
  }

  return metrics;
}
