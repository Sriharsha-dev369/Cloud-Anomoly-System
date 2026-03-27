import { Metric } from '../models/types';
import { getResource } from '../store/inMemoryStore';

export function generateMetrics(resourceId?: string): Metric[] {
  const resource = getResource(resourceId);
  const metrics: Metric[] = [];
  const now = Date.now();

  for (let i = 59; i >= 0; i--) {
    const timestamp = new Date(now - i * 60 * 1000).toISOString();
    // Minutes 0-39: healthy CPU (70-85%). Minutes 40-59: clear drop (0-2%).
    const cpu = i > 20
      ? 70 + Math.random() * 15
      : Math.random() * 2;
    // Cost grows linearly — visibly increases from $0 to full costPerHour over 60 min
    const cost = parseFloat((resource.costPerHour * ((60 - i) / 60)).toFixed(4));

    metrics.push({ resourceId: resource.id, timestamp, cpu: parseFloat(cpu.toFixed(1)), cost });
  }

  return metrics;
}
