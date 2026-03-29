import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { detectAnomalies } from '../services/anomalyService';
import { getUserResource, addLog, hasAnomalyBeenLogged, markAnomalyLogged } from '../store/inMemoryStore';
import { getAnomalyReasonLabel } from '../utils/anomalyLabels';
import { findAnomaliesByUser } from '../repositories/anomalyRepository';

export async function getAnomalies(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const source = req.query.source as string | undefined;
  const userId = req.userId!;

  // For user-owned resources: return stored anomalies from DB (populated by background detection).
  // The background runUserDetectionCycle() keeps these current.
  const stored = await findAnomaliesByUser(userId, resourceId);
  if (stored.length > 0) {
    res.json(stored.map((a) => ({
      resourceId: a.resourceId,
      type: a.type,
      confidence: a.confidence,
      detectedAt: a.detectedAt,
      ruleTriggered: a.ruleTriggered,
      mlTriggered: a.mlTriggered,
      anomalyScore: a.anomalyScore,
      confidenceLevel: a.confidenceLevel,
      reason: a.reason,
    })));
    return;
  }

  // Fallback: on-demand detection (demo resources or before first background cycle).
  const metrics = await generateMetrics(resourceId, source, undefined, userId);
  const anomalies = await detectAnomalies(metrics);

  let resource;
  try {
    resource = await getUserResource(resourceId!, userId);
  } catch {
    res.json([]);
    return;
  }

  if (resource.status === 'stopped') {
    res.json([]);
    return;
  }

  if (anomalies.length > 0) {
    if (!hasAnomalyBeenLogged(resource.id)) {
      const reasonLabel = getAnomalyReasonLabel(anomalies[0].type);
      await addLog({ resourceId: resource.id, type: 'anomaly', message: `Anomaly detected on ${resource.name}: ${reasonLabel} (confidence: ${Math.round(anomalies[0].confidence * 100)}%)` });
      markAnomalyLogged(resource.id);
    }
  }

  res.json(anomalies);
}
