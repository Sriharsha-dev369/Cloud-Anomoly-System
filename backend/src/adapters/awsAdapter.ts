import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import { Metric, Resource } from '../models/types';
import { CloudAdapter } from './types';
import { mockAdapter } from './mockAdapter';

const client = new CloudWatchClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

// Parses AWS_INSTANCE_MAP=res-001:i-0abc,res-002:i-0def into a lookup map.
function buildInstanceMap(): Record<string, string> {
  const raw = process.env.AWS_INSTANCE_MAP ?? '';
  const map: Record<string, string> = {};
  for (const entry of raw.split(',')) {
    const [resourceId, instanceId] = entry.trim().split(':');
    if (resourceId && instanceId) map[resourceId] = instanceId;
  }
  return map;
}

const instanceMap = buildInstanceMap();

function getInstanceId(resourceId: string): string | null {
  // Explicit mapping takes priority; fall back to treating the ID directly as an instance ID
  return instanceMap[resourceId] ?? (resourceId.startsWith('i-') ? resourceId : null);
}

export const awsAdapter: CloudAdapter = {
  async getMetrics(resourceId: string, resource: Resource, since?: string): Promise<Metric[]> {
    const instanceId = getInstanceId(resourceId);

    if (!instanceId) {
      return mockAdapter.getMetrics(resourceId, resource, since);
    }

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 60 * 60 * 1000); // last 60 min

      const cmd = new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: startTime,
        EndTime: now,
        Period: 60,
        Statistics: ['Average'],
      });

      const response = await client.send(cmd);
      const datapoints = response.Datapoints ?? [];

      if (datapoints.length === 0) {
        console.log(`[awsAdapter] No CloudWatch data for ${instanceId}, falling back to mock`);
        return mockAdapter.getMetrics(resourceId, resource);
      }

      // Sort ascending by timestamp
      datapoints.sort((a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0));

      // Build a full 60-point window, filling gaps with 0
      const metrics: Metric[] = [];
      const nowMs = now.getTime();

      for (let i = 59; i >= 0; i--) {
        const pointMs = nowMs - i * 60 * 1000;
        const timestamp = new Date(pointMs).toISOString();

        // Find a CloudWatch datapoint within ±30s of this slot
        const match = datapoints.find(
          (dp) => dp.Timestamp && Math.abs(dp.Timestamp.getTime() - pointMs) < 30_000
        );

        const cpu = match?.Average !== undefined ? parseFloat(match.Average.toFixed(1)) : 0;
        const cost = parseFloat((resource.costPerHour * ((60 - i) / 60)).toFixed(4));

        metrics.push({ resourceId: resource.id, timestamp, cpu, cost });
      }

      if (since) {
        const sinceMs = new Date(since).getTime();
        return metrics.filter((m) => new Date(m.timestamp).getTime() > sinceMs);
      }
      return metrics;
    } catch (err) {
      console.error('[awsAdapter] CloudWatch error, falling back to mock:', err);
      return mockAdapter.getMetrics(resourceId, resource, since);
    }
  },

  async getCost(_resourceId: string): Promise<number> {
    return 0;
  },
};
