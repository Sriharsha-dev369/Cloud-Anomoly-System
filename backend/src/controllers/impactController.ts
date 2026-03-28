import { Request, Response } from 'express';
import { getAllResources } from '../store/inMemoryStore';
import { calculateImpact } from '../services/costEngine';

export async function getImpact(_req: Request, res: Response): Promise<void> {
  const resources = await getAllResources();
  res.json(calculateImpact(resources));
}
