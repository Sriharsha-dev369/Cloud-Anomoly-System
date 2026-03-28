import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { detectAnomalies } from '../services/anomalyService';
import { getAutoMode, getResource, stopResource, addLog, hasAnomalyBeenLogged, markAnomalyLogged, hasAutoStopped, markAutoStopped } from '../store/inMemoryStore';

export async function getAnomalies(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const source = req.query.source as string | undefined;
  const metrics = await generateMetrics(resourceId, source);
  const anomalies = detectAnomalies(metrics);

  let resource;
  try {
    resource = await getResource(resourceId);
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
      const reason = anomalies[0].type;
      const reasonLabel = reason === 'spike_usage' ? 'CPU spike detected' : 'low CPU usage';
      await addLog({ resourceId: resource.id, type: 'anomaly', message: `Anomaly detected on ${resource.name}: ${reasonLabel}` });
      markAnomalyLogged(resource.id);
    }

    if (getAutoMode() && !hasAutoStopped(resource.id)) {
      markAutoStopped(resource.id);
      await stopResource(resource.id);
      const reasonLabel = anomalies[0].type === 'spike_usage' ? 'CPU spike detected' : 'low CPU usage';
      await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped automatically — ${reasonLabel}` });
    }
  }

  res.json(anomalies);
}
