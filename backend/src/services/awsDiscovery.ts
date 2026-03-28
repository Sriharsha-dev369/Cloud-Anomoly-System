import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { upsertResource, clearSeedResources } from '../repositories/resourceRepository';
import { clearSeedLogs } from '../repositories/logRepository';

const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });

// Approximate on-demand hourly rates (USD) for common instance types
const HOURLY_RATE: Record<string, number> = {
  't3.nano':    0.0052,
  't3.micro':   0.0104,
  't3.small':   0.0208,
  't3.medium':  0.0416,
  't3.large':   0.0832,
  't3.xlarge':  0.1664,
  't3.2xlarge': 0.3328,
  'm5.large':   0.096,
  'm5.xlarge':  0.192,
  'm5.2xlarge': 0.384,
  'm5.4xlarge': 0.768,
  'r5.large':   0.126,
  'r5.xlarge':  0.252,
  'r5.2xlarge': 0.504,
  'c5.large':   0.085,
  'c5.xlarge':  0.17,
  'p3.xlarge':  3.06,
  'p3.2xlarge': 6.12,
};

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
      const costPerHour = HOURLY_RATE[instanceType] ?? 0.10;
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
