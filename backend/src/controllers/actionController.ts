import { Request, Response } from 'express';
import { stopResource, restartResource, addLog, getResource } from '../store/inMemoryStore';

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return 'less than a minute';
}

export async function postStop(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  let existing: Awaited<ReturnType<typeof getResource>>;
  try {
    existing = await getResource(resourceId);
  } catch {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  if (existing.status === 'stopped') {
    res.status(409).json({ error: `${existing.name} is already stopped` });
    return;
  }
  const resource = await stopResource(resourceId);
  const duration = existing.startedAt
    ? ` (was running for ${formatDuration(Date.now() - new Date(existing.startedAt).getTime())})`
    : '';
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped by user${duration}` });
  res.json({ resource, action: { type: 'stop', status: 'completed', triggeredBy: 'user' } });
}

export async function postRestart(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  let existing: Awaited<ReturnType<typeof getResource>>;
  try {
    existing = await getResource(resourceId);
  } catch {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  if (existing.status === 'running') {
    res.status(409).json({ error: `${existing.name} is already running` });
    return;
  }
  const resource = await restartResource(resourceId);
  const downtime = existing.stoppedAt
    ? ` (was stopped for ${formatDuration(Date.now() - new Date(existing.stoppedAt).getTime())})`
    : '';
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} restarted${downtime} — monitoring resumed` });
  res.json({ resource, action: { type: 'restart', status: 'completed' } });
}
