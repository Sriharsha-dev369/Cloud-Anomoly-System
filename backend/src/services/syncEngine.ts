import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { Metric, Resource } from '../models/types';
import { detectAnomalies } from './anomalyService';
import { DetectedAnomaly } from '../detectors/types';
import { getAdapter } from '../adapters';
import {
  getAllResources,
  getUserResources,
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
import { getAllConnectedUserIds } from './awsCredentialService';
import { getAdapterForUser } from '../adapters';
import { withRetry, classifyAwsError } from '../utils/awsRetry';
import { AWS_REGION, isAwsMode } from '../utils/awsConfig';
import { getInstanceId } from '../utils/instanceMap';
import { getAnomalyReasonLabel } from '../utils/anomalyLabels';
import { upsertAnomaly, clearAnomaliesForResource } from '../repositories/anomalyRepository';

const POLL_INTERVAL_MS = 90_000;   // 90s — respects CloudWatch 60s granularity
const DETECT_INTERVAL_MS = 30_000; // 30s — detection + auto-mode cycle
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes — discard stale metrics

// ── Metrics cache ──────────────────────────────────────────────────────────
const metricsCache = new Map<string, { metrics: Metric[]; fetchedAt: number }>();

export function getCachedMetrics(resourceId: string): Metric[] | null {
  const entry = metricsCache.get(resourceId);
  if (!entry) return null;
  const ageMs = Date.now() - entry.fetchedAt;
  if (ageMs > CACHE_TTL_MS) return null;
  return entry.metrics;
}

export function setCachedMetrics(resourceId: string, metrics: Metric[]): void {
  metricsCache.set(resourceId, { metrics, fetchedAt: Date.now() });
}

// ── Per-user metrics polling ───────────────────────────────────────────────
async function pollUserMetrics(): Promise<void> {
  try {
    const userIds = await getAllConnectedUserIds();
    for (const userId of userIds) {
      try {
        const resources = await getUserResources(userId);
        const running = resources.filter((r) => r.status === 'running');
        if (running.length === 0) continue;

        const adapter = await getAdapterForUser(userId);
        for (const resource of running) {
          try {
            const metrics = await adapter.getMetrics(resource.id, resource);
            metricsCache.set(resource.id, { metrics, fetchedAt: Date.now() });
          } catch (err) {
            console.error(`[syncEngine] Failed to fetch metrics for user ${userId} resource ${resource.id}:`, (err as Error).message);
          }
        }
        console.debug(`[syncEngine] Polled ${running.length} resource(s) for user ${userId}`);
      } catch (err) {
        console.error(`[syncEngine] User ${userId} metrics poll failed:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.error('[syncEngine] User metrics poll failed:', err);
  }
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

  const ec2 = new EC2Client({ region: AWS_REGION });
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

// ── Detection helpers ─────────────────────────────────────────────────────
async function logAnomalyIfNew(resource: Resource, anomalies: DetectedAnomaly[]): Promise<void> {
  if (hasAnomalyBeenLogged(resource.id)) return;
  const reasonLabel = getAnomalyReasonLabel(anomalies[0].type);
  await addLog({
    resourceId: resource.id,
    type: 'anomaly',
    message: `Anomaly detected on ${resource.name}: ${reasonLabel} (confidence: ${Math.round(anomalies[0].confidence * 100)}%)`,
  });
  markAnomalyLogged(resource.id);
}

async function autoStopIfEnabled(resource: Resource, anomalies: DetectedAnomaly[]): Promise<void> {
  if (!getAutoMode() || hasAutoStopped(resource.id)) return;
  markAutoStopped(resource.id);

  if (isAwsMode() && !getLiveMode()) {
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
      return; // skip DB update if EC2 failed
    }
  }

  await stopResource(resource.id);
  setLastActionAt(resource.id);
  const reasonLabel = getAnomalyReasonLabel(anomalies[0].type);
  await addLog({
    resourceId: resource.id,
    type: 'action',
    message: `${resource.name} auto-stopped by system — ${reasonLabel}`,
  });
  console.log(`[syncEngine] Auto-stopped ${resource.id}: ${reasonLabel}`);
}

// ── Detection + auto-mode cycle ───────────────────────────────────────────
async function runDetectionCycle(): Promise<void> {
  try {
    const resources = await getAllResources();
    const running = resources.filter((r) => r.status === 'running');

    for (const resource of running) {
      const cached = getCachedMetrics(resource.id);
      if (!cached || cached.length === 0) continue;

      const anomalies = await detectAnomalies(cached);
      if (anomalies.length === 0) continue;

      await logAnomalyIfNew(resource, anomalies);
      await autoStopIfEnabled(resource, anomalies);
    }
  } catch (err) {
    console.error('[syncEngine] Detection cycle failed:', err);
  }
}

// ── Per-user detection cycle ───────────────────────────────────────────────
async function runUserDetectionCycle(): Promise<void> {
  try {
    const userIds = await getAllConnectedUserIds();
    for (const userId of userIds) {
      try {
        const resources = await getUserResources(userId);
        const running = resources.filter((r) => r.status === 'running');
        for (const resource of running) {
          const cached = getCachedMetrics(resource.id);
          if (!cached || cached.length === 0) continue;

          const anomalies = await detectAnomalies(cached);

          if (anomalies.length === 0) {
            await clearAnomaliesForResource(userId, resource.id);
            continue;
          }

          for (const anomaly of anomalies) {
            await upsertAnomaly(userId, anomaly);
          }

          if (!hasAnomalyBeenLogged(resource.id)) {
            const reasonLabel = getAnomalyReasonLabel(anomalies[0].type);
            await addLog({
              resourceId: resource.id,
              type: 'anomaly',
              message: `Anomaly detected on ${resource.name}: ${reasonLabel} (confidence: ${Math.round(anomalies[0].confidence * 100)}%)`,
            });
            markAnomalyLogged(resource.id);
          }
        }
      } catch (err) {
        console.error(`[syncEngine] User ${userId} detection cycle failed:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.error('[syncEngine] User detection cycle failed:', err);
  }
}

// ── Engine entry point ─────────────────────────────────────────────────────
export function startSyncEngine(): void {
  console.log('[syncEngine] Started — metrics every 90s, detection every 30s');

  // Metrics + reconciliation: every 90s
  const metricsTick = async () => {
    await pollMetrics();
    await pollUserMetrics();
    await reconcileState();
  };
  metricsTick();
  setInterval(metricsTick, POLL_INTERVAL_MS);

  // Detection + auto-mode: every 30s (offset 5s to let first metrics populate)
  setTimeout(() => {
    runDetectionCycle();
    runUserDetectionCycle();
    setInterval(() => { runDetectionCycle(); runUserDetectionCycle(); }, DETECT_INTERVAL_MS);
  }, 5_000);
}
