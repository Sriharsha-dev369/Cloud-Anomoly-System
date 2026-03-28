import { Request, Response } from 'express';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { getResource } from '../store/inMemoryStore';
import { Resource } from '../models/types';
import { AWS_REGION, isAwsMode } from '../utils/awsConfig';
import { getInstanceEntries } from '../utils/instanceMap';

const ec2 = new EC2Client({ region: AWS_REGION });

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
  if (!isAwsMode()) {
    res.json([]);
    return;
  }

  const entries = getInstanceEntries();
  const results = await Promise.all(
    entries.map(({ resourceId, instanceId }) => fetchLiveResource(resourceId, instanceId))
  );

  res.json(results.filter(Boolean));
}
