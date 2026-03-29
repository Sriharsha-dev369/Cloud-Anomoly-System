import { Metric } from '../models/types';
import { DetectedAnomaly } from '../detectors/types';
import { runDetectionPipeline } from '../detectors';
import { buildFeatureVectors } from './featureService';
import { detectAnomaly as detectMLAnomaly } from './mlService';

/**
 * Hybrid Decision Engine.
 * Combines ML logic cleanly beneath rule logic.
 * 
 * 1. Executes rule-based detections (Primary).
 * 2. If no rules trigger, uses ML (Isolation Forest) as Secondary detection.
 * 3. Adds confidence scoring (HIGH/MEDIUM/LOW).
 */
export async function detectAnomalies(metrics: Metric[]): Promise<DetectedAnomaly[]> {
  if (!metrics || metrics.length === 0) return [];

  // 2. Run rule detection
  const ruleAnomalies = runDetectionPipeline(metrics);
  const ruleTriggered = ruleAnomalies.length > 0;

  let mlResult;
  if (metrics.length > 20) {
    // 3. Build features
    const features = buildFeatureVectors(metrics);
    
    // 4. Run ML detection
    mlResult = await detectMLAnomaly(features);

    if (mlResult.status === 'error') {
      console.warn(`[ML_SKIPPED_FALLBACK] ML Failed: ${mlResult.errorMessage}. Relying only on rules.`);
    } else if (mlResult.status === 'skipped') {
      console.info(`[ML_SKIPPED_FALLBACK] ML Skipped: ${mlResult.errorMessage}`);
    } else if (mlResult.isAnomaly) {
      console.info(`[ML_ANOMALY_DETECTED] ML identified positive anomaly.`);
    }

  } else {
    console.info(`[ML_SKIPPED_FALLBACK] Insufficient data points (${metrics.length} <= 20). Skipping ML.`);
    mlResult = { isAnomaly: false, anomalyScore: 0, status: 'skipped' } as any; // mock empty result
  }

  // 5. Combine results maintaining Rule as primary
  if (ruleTriggered) {
    const primary = ruleAnomalies[0];
    primary.ruleTriggered = true;
    primary.mlTriggered = mlResult.isAnomaly;
    primary.anomalyScore = mlResult.anomalyScore;
    primary.confidenceLevel = 'HIGH';
    return [primary];
  }

  if (mlResult.isAnomaly) {
    const resourceId = metrics[0].resourceId; 
    return [{
      resourceId,
      type: 'spike_usage', 
      confidence: 0.6, // fallback numerical equivalent for backwards-compat 
      detectedAt: new Date().toISOString(),
      ruleTriggered: false,
      mlTriggered: true,
      anomalyScore: mlResult.anomalyScore,
      confidenceLevel: 'MEDIUM',
      reason: 'Deviation identified dynamically by ML Isolation Forest'
    }];
  }

  // Else -> false
  return [];
}
