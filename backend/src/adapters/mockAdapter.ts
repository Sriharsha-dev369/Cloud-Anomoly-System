import { Metric, Resource } from '../models/types';
import { getRestartedAt } from '../store/inMemoryStore';
import { CloudAdapter } from './types';

const patterns: Record<string, { normalMin: number; normalMax: number; dropAt: number; dropMax: number; spikeAfter?: number }> = {
  'res-001': { normalMin: 70, normalMax: 85, dropAt: 20, dropMax: 2           },
  'res-002': { normalMin: 60, normalMax: 80, dropAt:  0, dropMax: 75          },
  'res-003': { normalMin: 75, normalMax: 90, dropAt: 30, dropMax: 2           },
  'res-004': { normalMin: 65, normalMax: 78, dropAt: 15, dropMax: 2           },
  'res-005': { normalMin: 60, normalMax: 75, dropAt:  0, dropMax: 75, spikeAfter: 40 },
};

const defaultPattern = { normalMin: 65, normalMax: 80, dropAt: 20, dropMax: 2 };
const RECOVERY_MINUTES = 15;

export const mockAdapter: CloudAdapter = {
  async getMetrics(resourceId: string, resource: Resource, since?: string): Promise<Metric[]> {
    const pattern = patterns[resource.id] ?? defaultPattern;
    const metrics: Metric[] = [];
    const now = Date.now();

    const restartedAt = getRestartedAt(resource.id);
    const minutesSinceRestart = restartedAt
      ? (now - new Date(restartedAt).getTime()) / 60_000
      : null;
    const inRecovery = minutesSinceRestart !== null && minutesSinceRestart < RECOVERY_MINUTES;

    const stoppedAtMs = resource.stoppedAt ? new Date(resource.stoppedAt).getTime() : null;
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
        const inSpike = !inRecovery && pattern.spikeAfter !== undefined && i <= (60 - pattern.spikeAfter);
        const inDrop = !inRecovery && !inSpike && i <= pattern.dropAt;
        if (inSpike) {
          cpu = 91 + Math.random() * 8;
        } else if (inDrop) {
          cpu = Math.random() * pattern.dropMax;
        } else {
          cpu = pattern.normalMin + Math.random() * (pattern.normalMax - pattern.normalMin);
        }
        cost = parseFloat((resource.costPerHour * ((60 - i) / 60)).toFixed(4));
      }

      metrics.push({ resourceId: resource.id, timestamp, cpu: parseFloat(cpu.toFixed(1)), cost });
    }

    if (since) {
      const sinceMs = new Date(since).getTime();
      return metrics.filter((m) => new Date(m.timestamp).getTime() > sinceMs);
    }
    return metrics;
  },

  async getCost(_resourceId: string): Promise<number> {
    return 0; // cost is embedded per-metric; not used as a standalone value
  },
};
