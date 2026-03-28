import { Request, Response } from 'express';
import { getLogs } from '../store/inMemoryStore';

export async function getLogsHandler(req: Request, res: Response): Promise<void> {
  const resourceId = req.query.resourceId as string | undefined;
  const since = req.query.since as string | undefined;
  res.json(await getLogs(resourceId, since));
}
