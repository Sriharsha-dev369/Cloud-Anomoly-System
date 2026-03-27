import { Request, Response } from 'express';
import { getAllResources } from '../store/inMemoryStore';

export function getResources(_req: Request, res: Response): void {
  res.json(getAllResources());
}
