import { Metric } from '../models/types';
import { DetectedAnomaly } from '../detectors/types';
import { runDetectionPipeline } from '../detectors';

export function detectAnomalies(metrics: Metric[]): DetectedAnomaly[] {
  return runDetectionPipeline(metrics);
}
