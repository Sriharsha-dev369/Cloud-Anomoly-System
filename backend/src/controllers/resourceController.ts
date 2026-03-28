import { Request, Response } from 'express';
import { getUserResources } from '../store/inMemoryStore';

export async function getResources(req: Request, res: Response): Promise<void> {
  const resources = await getUserResources(req.userId!);
  res.json(resources);
}
