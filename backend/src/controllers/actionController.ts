import { Request, Response } from 'express';
import { stopResource, restartResource, addLog } from '../store/inMemoryStore';

export function postStop(req: Request, res: Response): void {
  const resourceId = req.body?.resourceId as string | undefined;
  const resource = stopResource(resourceId);
  addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped manually by user` });
  res.json({ resource, action: { type: 'stop', status: 'completed' } });
}

export function postRestart(req: Request, res: Response): void {
  const resourceId = req.body?.resourceId as string | undefined;
  const resource = restartResource(resourceId);
  addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} restarted — monitoring resumed` });
  res.json({ resource, action: { type: 'restart', status: 'completed' } });
}
