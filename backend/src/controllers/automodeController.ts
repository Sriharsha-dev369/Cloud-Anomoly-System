import { Request, Response } from 'express';
import { getAutoMode, setAutoMode } from '../store/inMemoryStore';

export function getAutoModeHandler(req: Request, res: Response): void {
  res.json({ autoMode: getAutoMode() });
}

export function setAutoModeHandler(req: Request, res: Response): void {
  const { enabled } = req.body as { enabled: boolean };
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled must be a boolean' });
    return;
  }
  setAutoMode(enabled);
  res.json({ autoMode: getAutoMode() });
}
