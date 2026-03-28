import { Metric } from '../models/types';
import { DetectedAnomaly, Detector } from './types';
import { lowUsageDetector } from './lowUsageDetector';
import { spikeDetector } from './spikeDetector';

const detectors: Detector[] = [
  lowUsageDetector,
  spikeDetector,
];

export function runDetectionPipeline(metrics: Metric[]): DetectedAnomaly[] {
  return detectors.flatMap((d) => d.detect(metrics));
}
