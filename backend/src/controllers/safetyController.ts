import { Request, Response } from 'express';
import { getLiveMode, setLiveMode } from '../store/inMemoryStore';

export function getSafetyStatus(_req: Request, res: Response): void {
  res.json({ liveMode: getLiveMode() });
}

export function postLiveMode(req: Request, res: Response): void {
  const enabled = req.body?.enabled;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }
  setLiveMode(enabled);
  res.json({ liveMode: getLiveMode() });
}
