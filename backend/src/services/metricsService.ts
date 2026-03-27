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

  for (let i = 59; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 1000).toISOString();
    const inDrop = !inRecovery && i <= pattern.dropAt;
    const cpu = inDrop
      ? Math.random() * pattern.dropMax
      : pattern.normalMin + Math.random() * (pattern.normalMax - pattern.normalMin);
    const cost = parseFloat((resource.costPerHour * ((60 - i) / 60)).toFixed(4));

    metrics.push({ resourceId: resource.id, timestamp, cpu: parseFloat(cpu.toFixed(1)), cost });
  }

  return metrics;
}
