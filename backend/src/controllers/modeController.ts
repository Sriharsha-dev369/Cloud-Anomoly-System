import { Request, Response } from 'express';

export function getMode(_req: Request, res: Response): void {
  res.json({ mode: process.env.DATA_SOURCE === 'aws' ? 'aws' : 'mock' });
}
