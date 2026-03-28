import { Request, Response } from 'express';
import { getUserResources } from '../store/inMemoryStore';
import { calculateImpact } from '../services/costEngine';

export async function getImpact(req: Request, res: Response): Promise<void> {
  const resources = await getUserResources(req.userId!);
  res.json(calculateImpact(resources));
}
