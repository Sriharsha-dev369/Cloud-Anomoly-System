import { Request, Response } from 'express';
import { stopResource } from '../store/inMemoryStore';

export function postStop(_req: Request, res: Response): void {
  const resource = stopResource();
  res.json({ resource, action: { type: 'stop', status: 'completed' } });
}
