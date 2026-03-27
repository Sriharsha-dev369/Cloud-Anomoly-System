import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { detectAnomalies } from '../services/anomalyService';
import { getAutoMode, getResource, stopResource, addLog, hasAnomalyBeenLogged, markAnomalyLogged } from '../store/inMemoryStore';

export async function getAnomalies(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const metrics = await generateMetrics(resourceId);
  const anomalies = detectAnomalies(metrics);

  if (anomalies.length > 0) {
    const resource = await getResource(resourceId);
    if (resource.status === 'running') {
      if (!hasAnomalyBeenLogged(resource.id)) {
        const reason = anomalies[0].reason;
        const reasonLabel = reason === 'spike_usage' ? 'CPU spike detected' : 'low CPU usage';
        await addLog({ resourceId: resource.id, type: 'anomaly', message: `Anomaly detected on ${resource.name}: ${reasonLabel}` });
        markAnomalyLogged(resource.id);

        if (getAutoMode()) {
          await stopResource(resourceId);
          await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped automatically by system` });
        }
      }
    }
  }

  res.json(anomalies);
}
