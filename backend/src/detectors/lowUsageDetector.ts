import { Metric } from '../models/types';
import { DetectedAnomaly, Detector } from './types';

const LOW_CPU_THRESHOLD = 5;
const WINDOW = 10;

export const lowUsageDetector: Detector = {
  detect(metrics: Metric[]): DetectedAnomaly[] {
    if (metrics.length < WINDOW) return [];
    const window = metrics.slice(-WINDOW);

    const allLow = window.every((m) => m.cpu < LOW_CPU_THRESHOLD);
    if (!allLow) return [];

    const costIncreasing = window[window.length - 1].cost > window[0].cost;
    if (!costIncreasing) return [];

    const avgCpu = window.reduce((sum, m) => sum + m.cpu, 0) / WINDOW;
    const deviationScore = (LOW_CPU_THRESHOLD - avgCpu) / LOW_CPU_THRESHOLD;
    const confidence = parseFloat(Math.min(1, Math.max(0, 0.5 + 0.5 * deviationScore)).toFixed(2));

    return [{
      resourceId: window[0].resourceId,
      type: 'low_usage',
      detectedAt: window[window.length - 1].timestamp,
      confidence,
    }];
  },
};
