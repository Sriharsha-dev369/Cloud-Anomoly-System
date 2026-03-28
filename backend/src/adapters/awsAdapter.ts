import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  EC2Client,
  StopInstancesCommand,
  StartInstancesCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import { Metric, Resource } from '../models/types';
import { CloudAdapter } from './types';
import { mockAdapter } from './mockAdapter';
import { getCostPerHour } from '../services/costRates';
import { withRetry, classifyAwsError, isPermissionError } from '../utils/retry';

const client = new CloudWatchClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });

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

/**
 * Polls DescribeInstances every 3s until instance reaches targetState or timeout.
 * Throws on timeout so the caller knows the state was NOT confirmed.
 */
async function waitForInstanceState(
  instanceId: string,
  targetState: 'stopped' | 'running',
  timeoutMs = 60_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 3_000));
    const resp = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    const currentState = resp.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    if (currentState === targetState) return;
    console.debug(`[awsAdapter] Waiting for ${instanceId}: '${currentState}' → '${targetState}'`);
  }
  throw new Error(`Timeout: ${instanceId} did not reach '${targetState}' within ${timeoutMs / 1000}s`);
}

// Fills null slots with linear interpolation between known values.
// Leading nulls → forward-filled with first known value.
// Trailing nulls → backward-filled with last known value.
// All-null → returns array of zeros (adapter falls back to mock anyway).
function interpolateGaps(slots: (number | null)[]): number[] {
  const result = [...slots];

  const firstKnown = result.find((v) => v !== null) ?? null;
  if (firstKnown === null) return new Array(slots.length).fill(0);

  for (let i = 0; i < result.length; i++) {
    if (result[i] !== null) break;
    result[i] = firstKnown;
  }

  let left = 0;
  while (left < result.length) {
    if (result[left] === null) { left++; continue; }
    let right = left + 1;
    while (right < result.length && result[right] === null) right++;
    if (right < result.length) {
      const span = right - left;
      const startVal = result[left]!;
      const endVal = result[right]!;
      for (let k = 1; k < span; k++) {
        result[left + k] = startVal + (endVal - startVal) * (k / span);
      }
    } else {
      const lastKnown = result[left]!;
      for (let k = left + 1; k < result.length; k++) result[k] = lastKnown;
    }
    left = right;
  }

  return result.map((v) => parseFloat((v ?? 0).toFixed(1)));
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

      const response = await withRetry(() => client.send(cmd));
      const datapoints = response.Datapoints ?? [];
      console.debug(`[awsAdapter] CloudWatch returned ${datapoints.length} datapoint(s) for ${instanceId}`);

      if (datapoints.length === 0) {
        console.log(`[awsAdapter] No CloudWatch data for ${instanceId}, falling back to mock`);
        return mockAdapter.getMetrics(resourceId, resource);
      }

      // Sort ascending by timestamp
      datapoints.sort((a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0));

      const nowMs = now.getTime();

      // Collect into a slot array (null = no CloudWatch datapoint for this minute)
      const slots: (number | null)[] = new Array(60).fill(null);
      for (let i = 59; i >= 0; i--) {
        const pointMs = nowMs - i * 60_000;
        const match = datapoints.find(
          (dp) => dp.Timestamp && Math.abs(dp.Timestamp.getTime() - pointMs) < 30_000
        );
        if (match?.Average !== undefined) {
          slots[59 - i] = parseFloat(match.Average.toFixed(1));
        }
      }

      const smoothedCpu = interpolateGaps(slots);

      const metrics: Metric[] = [];
      for (let i = 59; i >= 0; i--) {
        const pointMs = nowMs - i * 60_000;
        const timestamp = new Date(pointMs).toISOString();
        const cpu = smoothedCpu[59 - i];
        const cost = parseFloat((getCostPerHour(resource.instanceType, resource.costPerHour) * ((60 - i) / 60)).toFixed(4));
        metrics.push({ resourceId: resource.id, timestamp, cpu, cost });
      }

      const cpuValues = smoothedCpu.filter((v) => v > 0);
      const cpuMin = cpuValues.length ? Math.min(...cpuValues).toFixed(1) : '0';
      const cpuMax = cpuValues.length ? Math.max(...cpuValues).toFixed(1) : '0';
      console.debug(`[awsAdapter] Transformed ${metrics.length} metrics for ${resourceId} (cpu range: ${cpuMin}%–${cpuMax}%)`);

      if (since) {
        const sinceMs = new Date(since).getTime();
        return metrics.filter((m) => new Date(m.timestamp).getTime() > sinceMs);
      }
      return metrics;
    } catch (err) {
      const label = classifyAwsError(err);
      if (isPermissionError(err)) {
        console.error(`[awsAdapter] ${label}: insufficient permissions for CloudWatch on ${instanceId} — falling back to mock`);
      } else {
        console.error(`[awsAdapter] ${label}: CloudWatch fetch failed for ${instanceId} — falling back to mock:`, (err as Error).message);
      }
      return mockAdapter.getMetrics(resourceId, resource, since);
    }
  },

  async getCost(_resourceId: string): Promise<number> {
    return 0;
  },

  async stopResource(resourceId: string): Promise<void> {
    const instanceId = getInstanceId(resourceId);
    if (!instanceId) return;
    try {
      await withRetry(() => ec2.send(new StopInstancesCommand({ InstanceIds: [instanceId] })));
      console.debug(`[awsAdapter] EC2 StopInstances sent for ${instanceId}, waiting for confirmation…`);
      await waitForInstanceState(instanceId, 'stopped');
      console.debug(`[awsAdapter] EC2 instance ${instanceId} confirmed stopped`);
    } catch (err) {
      const label = classifyAwsError(err);
      console.error(`[awsAdapter] ${label}: StopInstances failed for ${instanceId}:`, (err as Error).message);
      throw err;
    }
  },

  async startResource(resourceId: string): Promise<void> {
    const instanceId = getInstanceId(resourceId);
    if (!instanceId) return;
    try {
      await withRetry(() => ec2.send(new StartInstancesCommand({ InstanceIds: [instanceId] })));
      console.debug(`[awsAdapter] EC2 StartInstances sent for ${instanceId}, waiting for confirmation…`);
      await waitForInstanceState(instanceId, 'running');
      console.debug(`[awsAdapter] EC2 instance ${instanceId} confirmed running`);
    } catch (err) {
      const label = classifyAwsError(err);
      console.error(`[awsAdapter] ${label}: StartInstances failed for ${instanceId}:`, (err as Error).message);
      throw err;
    }
  },
};
