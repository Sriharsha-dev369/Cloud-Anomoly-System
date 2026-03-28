import { Metric } from '../models/types';
import { DetectedAnomaly, Detector } from './types';

const HIGH_CPU_THRESHOLD = 90;
const WINDOW = 10;

export const spikeDetector: Detector = {
  detect(metrics: Metric[]): DetectedAnomaly[] {
    if (metrics.length < WINDOW) return [];
    const window = metrics.slice(-WINDOW);

    const allHigh = window.every((m) => m.cpu > HIGH_CPU_THRESHOLD);
    if (!allHigh) return [];

    const avgCpu = window.reduce((sum, m) => sum + m.cpu, 0) / WINDOW;
    const deviationScore = (avgCpu - HIGH_CPU_THRESHOLD) / (100 - HIGH_CPU_THRESHOLD);
    const confidence = parseFloat(Math.min(1, Math.max(0, 0.5 + 0.5 * deviationScore)).toFixed(2));

    return [{
      resourceId: window[0].resourceId,
      type: 'spike_usage',
      detectedAt: window[window.length - 1].timestamp,
      confidence,
    }];
  },
};
