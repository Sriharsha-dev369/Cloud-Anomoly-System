import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { Metric } from '../models/types';
import { runDetectionPipeline } from '../detectors';
import { getAdapter } from '../adapters';
import {
  getAllResources,
  stopResource,
  restartResource,
  addLog,
  getAutoMode,
  getLiveMode,
  hasAnomalyBeenLogged,
  markAnomalyLogged,
  hasAutoStopped,
  markAutoStopped,
  setLastActionAt,
} from '../store/inMemoryStore';
import { withRetry, classifyAwsError } from '../utils/retry';

const isAwsMode = () => process.env.DATA_SOURCE === 'aws';

const POLL_INTERVAL_MS = 90_000;   // 90s — respects CloudWatch 60s granularity
const DETECT_INTERVAL_MS = 30_000; // 30s — detection + auto-mode cycle

// ── Metrics cache ──────────────────────────────────────────────────────────
const metricsCache = new Map<string, { metrics: Metric[]; fetchedAt: number }>();

export function getCachedMetrics(resourceId: string): Metric[] | null {
  const entry = metricsCache.get(resourceId);
  if (!entry) return null;
  const ageMs = Date.now() - entry.fetchedAt;
  if (ageMs > 2 * 60 * 1000) return null; // stale if older than 2 minutes
  return entry.metrics;
}

// ── Instance ID resolution (mirrors awsAdapter logic, no import coupling) ──
function buildInstanceMap(): Record<string, string> {
  const raw = process.env.AWS_INSTANCE_MAP ?? '';
  const map: Record<string, string> = {};
  for (const entry of raw.split(',')) {
    const [resourceId, instanceId] = entry.trim().split(':');
    if (resourceId && instanceId) map[resourceId] = instanceId;
  }
  return map;
}

function getInstanceId(resourceId: string): string | null {
  const map = buildInstanceMap();
  return map[resourceId] ?? (resourceId.startsWith('i-') ? resourceId : null);
}

// ── Metrics polling ────────────────────────────────────────────────────────
async function pollMetrics(): Promise<void> {
  try {
    const resources = await getAllResources();
    const running = resources.filter((r) => r.status === 'running');

    for (const resource of running) {
      try {
        const metrics = await getAdapter().getMetrics(resource.id, resource);
        metricsCache.set(resource.id, { metrics, fetchedAt: Date.now() });
      } catch (err) {
        console.error(`[syncEngine] Failed to fetch metrics for ${resource.id}:`, err);
      }
    }

    if (running.length > 0) {
      // Log one entry per cycle, not per resource
      const firstResource = running[0];
      await addLog({
        resourceId: firstResource.id,
        type: 'action',
        message: `AWS_METRIC_FETCHED — polled ${running.length} running resource(s)`,
      });
    }
  } catch (err) {
    console.error('[syncEngine] Metrics poll failed:', err);
  }
}

// ── State reconciliation (AWS-only) ─────────────────────────────────────
async function reconcileState(): Promise<void> {
  if (!isAwsMode()) return; // nothing to reconcile in simulation mode

  const ec2 = new EC2Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
  try {
    const resources = await getAllResources();

    // Build map of resourceId → instanceId for resources that have one
    const mappedResources = resources
      .map((r) => ({ resource: r, instanceId: getInstanceId(r.id) }))
      .filter((x): x is { resource: typeof x.resource; instanceId: string } => x.instanceId !== null);

    if (mappedResources.length === 0) return;

    const instanceIds = mappedResources.map((x) => x.instanceId);
    const response = await withRetry(() =>
      ec2.send(new DescribeInstancesCommand({ InstanceIds: instanceIds }))
    );
    const instances = response.Reservations?.flatMap((r) => r.Instances ?? []) ?? [];

    // Build a map of instanceId → actual AWS state
    const awsStateMap = new Map<string, 'running' | 'stopped'>();
    for (const inst of instances) {
      if (inst.InstanceId) {
        const awsState: 'running' | 'stopped' =
          inst.State?.Name === 'running' ? 'running' : 'stopped';
        awsStateMap.set(inst.InstanceId, awsState);
      }
    }

    // Reconcile each resource
    for (const { resource, instanceId } of mappedResources) {
      const awsState = awsStateMap.get(instanceId);
      if (!awsState) continue; // instance not found in describe response

      if (awsState === 'stopped' && resource.status === 'running') {
        // AWS stopped the instance externally — sync DB
        await stopResource(resource.id);
        await addLog({
          resourceId: resource.id,
          type: 'action',
          message: `${resource.name} stopped externally (AWS reconciliation)`,
        });
        console.log(`[syncEngine] Reconciled ${resource.id}: running → stopped`);
      } else if (awsState === 'running' && resource.status === 'stopped') {
        // AWS started the instance externally — sync DB
        await restartResource(resource.id);
        await addLog({
          resourceId: resource.id,
          type: 'action',
          message: `${resource.name} started externally (AWS reconciliation)`,
        });
        console.log(`[syncEngine] Reconciled ${resource.id}: stopped → running`);
      }
    }
  } catch (err) {
    const label = classifyAwsError(err);
    console.error(`[syncEngine] ${label}: State reconciliation failed:`, (err as Error).message);
  }
}

// ── Detection + auto-mode cycle ───────────────────────────────────────────
async function runDetectionCycle(): Promise<void> {
  try {
    const resources = await getAllResources();
    const running = resources.filter((r) => r.status === 'running');

    for (const resource of running) {
      const cached = getCachedMetrics(resource.id);
      if (!cached || cached.length === 0) continue;

      const anomalies = runDetectionPipeline(cached);
      if (anomalies.length === 0) continue;

      // Log anomaly (deduped)
      if (!hasAnomalyBeenLogged(resource.id)) {
        const reason = anomalies[0].type;
        const reasonLabel = reason === 'spike_usage' ? 'CPU spike detected' : 'low CPU usage';
        await addLog({
          resourceId: resource.id,
          type: 'anomaly',
          message: `Anomaly detected on ${resource.name}: ${reasonLabel} (confidence: ${Math.round(anomalies[0].confidence * 100)}%)`,
        });
        markAnomalyLogged(resource.id);
      }

      // Auto-mode: stop the resource if enabled
      if (getAutoMode() && !hasAutoStopped(resource.id)) {
        markAutoStopped(resource.id);

        const awsMode = process.env.DATA_SOURCE === 'aws';
        if (awsMode && !getLiveMode()) {
          await addLog({
            resourceId: resource.id,
            type: 'action',
            message: `[SIMULATION] Auto-stop simulated for ${resource.name} — Live Mode is OFF`,
          });
        } else {
          try {
            await addLog({ resourceId: resource.id, type: 'action', message: `AWS_ACTION_TRIGGERED — auto-stop sent to ${resource.instanceType ?? resource.id}` });
            await getAdapter().stopResource(resource.id);
            await addLog({ resourceId: resource.id, type: 'action', message: `AWS_ACTION_COMPLETED — ${resource.name} auto-stopped on EC2` });
          } catch (err) {
            console.error(`[syncEngine] Auto-stop EC2 call failed for ${resource.id}:`, (err as Error).message);
            await addLog({ resourceId: resource.id, type: 'action', message: `AWS_ACTION_FAILED — auto-stop failed for ${resource.name}: ${(err as Error).message}` });
            continue; // skip DB update if EC2 failed
          }
        }

        await stopResource(resource.id);
        setLastActionAt(resource.id);
        const reasonLabel = anomalies[0].type === 'spike_usage' ? 'CPU spike detected' : 'low CPU usage';
        await addLog({
          resourceId: resource.id,
          type: 'action',
          message: `${resource.name} auto-stopped by system — ${reasonLabel}`,
        });
        console.log(`[syncEngine] Auto-stopped ${resource.id}: ${reasonLabel}`);
      }
    }
  } catch (err) {
    console.error('[syncEngine] Detection cycle failed:', err);
  }
}

// ── Engine entry point ─────────────────────────────────────────────────────
export function startSyncEngine(): void {
  console.log('[syncEngine] Started — metrics every 90s, detection every 30s');

  // Metrics + reconciliation: every 90s
  const metricsTick = async () => {
    await pollMetrics();
    await reconcileState();
  };
  metricsTick();
  setInterval(metricsTick, POLL_INTERVAL_MS);

  // Detection + auto-mode: every 30s (offset 5s to let first metrics populate)
  setTimeout(() => {
    runDetectionCycle();
    setInterval(runDetectionCycle, DETECT_INTERVAL_MS);
  }, 5_000);
}
