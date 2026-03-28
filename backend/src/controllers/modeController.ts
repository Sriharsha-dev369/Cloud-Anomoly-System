import { Request, Response } from 'express';
import { isAwsMode } from '../utils/awsConfig';

export function getMode(_req: Request, res: Response): void {
  res.json({ mode: isAwsMode() ? 'aws' : 'mock' });
}
