import { Request, Response } from 'express';
import { stopResource, restartResource, addLog, getResource } from '../store/inMemoryStore';

export async function postStop(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  const existing = await getResource(resourceId);
  if (existing.status === 'stopped') {
    res.status(409).json({ error: 'Resource is already stopped' });
    return;
  }
  const resource = await stopResource(resourceId);
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped manually by user` });
  res.json({ resource, action: { type: 'stop', status: 'completed' } });
}

export async function postRestart(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  const resource = await restartResource(resourceId);
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} restarted — monitoring resumed` });
  res.json({ resource, action: { type: 'restart', status: 'completed' } });
}
