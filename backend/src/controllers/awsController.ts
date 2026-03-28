import { Request, Response } from 'express';
import { connectAwsCredentials } from '../services/awsCredentialService';
import { syncUserResources } from '../services/resourceSyncService';

export async function postConnect(req: Request, res: Response): Promise<void> {
  const { accessKeyId, secretAccessKey, region } = req.body as {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };

  if (!accessKeyId || !secretAccessKey) {
    res.status(400).json({ error: 'accessKeyId and secretAccessKey are required' });
    return;
  }

  try {
    await connectAwsCredentials(req.userId!, accessKeyId, secretAccessKey, region);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AWS connection failed';
    res.status(400).json({ error: `AWS validation failed: ${message}` });
    return;
  }

  // Sync EC2 resources after credentials are confirmed valid.
  // Non-fatal: missing ec2:DescribeInstances permission won't block the connection.
  let resourceCount = 0;
  try {
    resourceCount = await syncUserResources(req.userId!);
  } catch (err) {
    console.warn(`[awsController] Resource sync failed for user ${req.userId}:`, (err as Error).message);
  }

  res.json({ connected: true, resourceCount });
}
