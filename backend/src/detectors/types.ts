import { Anomaly, Metric } from '../models/types';

export interface DetectedAnomaly extends Anomaly {
  confidence: number; // 0–1
}

export interface Detector {
  detect(metrics: Metric[]): DetectedAnomaly[];
}
