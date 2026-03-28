import { Request, Response } from 'express';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { getResource } from '../store/inMemoryStore';
import { Resource } from '../models/types';

const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });

function parseInstanceMap(): Array<{ resourceId: string; instanceId: string }> {
  const raw = process.env.AWS_INSTANCE_MAP ?? '';
  return raw
    .split(',')
    .map((entry) => {
      const [resourceId, instanceId] = entry.trim().split(':');
      return resourceId && instanceId ? { resourceId, instanceId } : null;
    })
    .filter(Boolean) as Array<{ resourceId: string; instanceId: string }>;
}

function toStatus(state?: string): 'running' | 'stopped' {
  return state === 'running' ? 'running' : 'stopped';
}

async function fetchLiveResource(resourceId: string, instanceId: string): Promise<Resource | null> {
  try {
    const res = await ec2.send(new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    }));

    const instance = res.Reservations?.[0]?.Instances?.[0];
    if (!instance) return null;

    const nameTag = instance.Tags?.find((t) => t.Key === 'Name')?.Value;
    const name = nameTag ?? instanceId;
    const status = toStatus(instance.State?.Name);

    // Look up costPerHour from DB resource seeded for this resourceId
    let costPerHour = 0.5;
    try {
      const dbResource = await getResource(resourceId);
      costPerHour = dbResource.costPerHour;
    } catch {
      // DB resource not found for this ID — use default
    }

    return { id: resourceId, name, status, costPerHour };
  } catch (err) {
    console.warn(`[liveResources] Skipping ${instanceId}:`, (err as Error).message);
    return null;
  }
}

export async function getLiveResources(_req: Request, res: Response): Promise<void> {
  if (process.env.DATA_SOURCE !== 'aws') {
    res.json([]);
    return;
  }

  const entries = parseInstanceMap();
  const results = await Promise.all(
    entries.map(({ resourceId, instanceId }) => fetchLiveResource(resourceId, instanceId))
  );

  res.json(results.filter(Boolean));
}
