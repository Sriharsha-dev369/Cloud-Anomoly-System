import { Request, Response } from 'express';
import { getAllResources } from '../store/inMemoryStore';

export async function getResources(_req: Request, res: Response): Promise<void> {
  const resources = await getAllResources();
  res.json(resources);
}
