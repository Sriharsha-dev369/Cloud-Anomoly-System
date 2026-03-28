import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { getAwsCredentials } from './awsCredentialService';
import { createEc2Client } from '../utils/awsClientFactory';
import { getCostPerHour } from './costRates';
import { upsertUserResource } from '../repositories/resourceRepository';
import { Resource } from '../models/types';

// Maps a raw EC2 instance to the internal Resource shape.
function mapInstance(instance: {
  InstanceId?: string;
  InstanceType?: string;
  State?: { Name?: string };
  Tags?: Array<{ Key?: string; Value?: string }>;
  LaunchTime?: Date;
}, userId: string): {
  resourceId: string;
  userId: string;
  name: string;
  instanceType: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  startedAt?: string;
} {
  const resourceId = instance.InstanceId!;
  const instanceType = instance.InstanceType ?? 'unknown';
  const name = instance.Tags?.find((t) => t.Key === 'Name')?.Value ?? resourceId;
  const status: 'running' | 'stopped' =
    instance.State?.Name === 'running' ? 'running' : 'stopped';
  const costPerHour = getCostPerHour(instanceType);
  const startedAt = instance.LaunchTime?.toISOString();
  return { resourceId, userId, name, instanceType, status, costPerHour, startedAt };
}

// Fetches all EC2 instances for the user's connected AWS account and upserts them.
// Returns the number of instances synced.
export async function syncUserResources(userId: string): Promise<number> {
  const creds = await getAwsCredentials(userId);
  if (!creds) throw new Error('No AWS credentials found for user');

  const ec2 = createEc2Client(creds);
  const response = await ec2.send(new DescribeInstancesCommand({}));
  const instances = response.Reservations?.flatMap((r) => r.Instances ?? []) ?? [];

  for (const instance of instances) {
    if (!instance.InstanceId) continue;
    const data = mapInstance(instance, userId);
    await upsertUserResource(data);
  }

  console.log(`[resourceSyncService] Synced ${instances.length} EC2 instance(s) for user ${userId}`);
  return instances.length;
}

// Returns stored resources for a user as the internal Resource type.
export function toResource(userId: string, doc: {
  resourceId: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  stoppedAt?: string;
  startedAt?: string;
  instanceType?: string;
}): Resource {
  return {
    id: doc.resourceId,
    name: doc.name,
    status: doc.status,
    costPerHour: doc.costPerHour,
    stoppedAt: doc.stoppedAt,
    startedAt: doc.startedAt,
    instanceType: doc.instanceType,
  };
}
