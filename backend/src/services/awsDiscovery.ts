import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { upsertResource, clearSeedResources } from '../repositories/resourceRepository';
import { clearSeedLogs } from '../repositories/logRepository';
import { getCostPerHour } from './costRates';
import { AWS_REGION } from '../utils/awsConfig';

const ec2 = new EC2Client({ region: AWS_REGION });

export async function syncEC2Instances(): Promise<void> {
  try {
    const response = await ec2.send(new DescribeInstancesCommand({}));
    const instances = response.Reservations?.flatMap((r) => r.Instances ?? []) ?? [];

    if (instances.length === 0) {
      console.log('[awsDiscovery] No EC2 instances found in region — keeping existing data');
      return;
    }

    // Upsert all discovered instances first
    for (const instance of instances) {
      const resourceId = instance.InstanceId!;
      const instanceType = instance.InstanceType ?? 'unknown';
      const name = instance.Tags?.find((t) => t.Key === 'Name')?.Value ?? resourceId;
      const status: 'running' | 'stopped' =
        instance.State?.Name === 'running' ? 'running' : 'stopped';
      const costPerHour = getCostPerHour(instanceType);
      const startedAt = instance.LaunchTime?.toISOString();

      await upsertResource({ resourceId, name, instanceType, status, costPerHour, startedAt });
    }

    // Only remove fake seed data after successful discovery
    await clearSeedResources();
    await clearSeedLogs();

    console.log(`[awsDiscovery] Synced ${instances.length} EC2 instance(s)`);
  } catch (err) {
    console.error('[awsDiscovery] Failed to sync from EC2, keeping existing data:', err);
  }
}
