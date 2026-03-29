import { AnomalyModel, AnomalyDocument } from '../db/AnomalyModel';
import { DetectedAnomaly } from '../detectors/types';

// Upsert a single anomaly for a user resource (keyed on userId + resourceId + type).
export async function upsertAnomaly(userId: string, anomaly: DetectedAnomaly): Promise<void> {
  await AnomalyModel.findOneAndUpdate(
    { userId, resourceId: anomaly.resourceId, type: anomaly.type },
    { 
      confidence: anomaly.confidence, 
      detectedAt: anomaly.detectedAt,
      ruleTriggered: anomaly.ruleTriggered,
      mlTriggered: anomaly.mlTriggered,
      anomalyScore: anomaly.anomalyScore,
      confidenceLevel: anomaly.confidenceLevel,
      reason: anomaly.reason
    },
    { upsert: true },
  );
}

// Return all stored anomalies for a user, optionally filtered by resource.
export async function findAnomaliesByUser(
  userId: string,
  resourceId?: string,
): Promise<AnomalyDocument[]> {
  const filter: Record<string, string> = { userId };
  if (resourceId) filter.resourceId = resourceId;
  return AnomalyModel.find(filter).sort({ detectedAt: -1 }).lean() as unknown as Promise<AnomalyDocument[]>;
}

// Remove all stored anomalies for a specific resource (called when detection clears).
export async function clearAnomaliesForResource(userId: string, resourceId: string): Promise<void> {
  await AnomalyModel.deleteMany({ userId, resourceId });
}
