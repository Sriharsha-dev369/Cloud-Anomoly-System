import { Request, Response } from 'express';
import { generateMetrics } from '../services/metricsService';
import { detectAnomalies } from '../services/anomalyService';
import { getAutoMode, getResource, stopResource, addLog, hasAnomalyBeenLogged, markAnomalyLogged } from '../store/inMemoryStore';

export function getAnomalies(req: Request, res: Response): void {
  const resourceId = req.query.resourceId as string | undefined;
  const metrics = generateMetrics(resourceId);
  const anomalies = detectAnomalies(metrics);

  if (anomalies.length > 0) {
    const resource = getResource(resourceId);
    if (resource.status === 'running') {
      if (!hasAnomalyBeenLogged(resource.id)) {
        addLog({ resourceId: resource.id, type: 'anomaly', message: `Anomaly detected on ${resource.name}: low CPU usage` });
        markAnomalyLogged(resource.id);
      }

      if (getAutoMode()) {
        stopResource(resourceId);
        addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped automatically by system` });
      }
    }
  }

  res.json(anomalies);
}
