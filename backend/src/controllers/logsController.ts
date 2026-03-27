import { Request, Response } from 'express';
import { getLogs } from '../store/inMemoryStore';

export function getLogsHandler(req: Request, res: Response): void {
  const resourceId = req.query.resourceId as string | undefined;
  let logs = getLogs();
  if (resourceId) logs = logs.filter((l) => l.resourceId === resourceId);
  res.json(logs.slice().reverse());
}
