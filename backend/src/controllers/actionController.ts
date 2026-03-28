import { Request, Response } from 'express';
import { Resource } from '../models/types';
import {
  stopResource,
  restartResource,
  addLog,
  getResource,
  getLiveMode,
  getLastActionAt,
  setLastActionAt,
} from '../store/inMemoryStore';
import { getAdapter } from '../adapters';
import { isAwsMode } from '../utils/awsConfig';

const AWS_COOLDOWN_MS = 5 * 60 * 1000;  // 5 minutes — real EC2 needs time
const MOCK_COOLDOWN_MS = 30 * 1000;     // 30 seconds — simulation is instant
const COOLDOWN_MS = isAwsMode() ? AWS_COOLDOWN_MS : MOCK_COOLDOWN_MS;

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return 'less than a minute';
}

function cooldownRemaining(resourceId: string): number {
  const last = getLastActionAt(resourceId);
  if (!last) return 0;
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

// Shared validation: resource lookup, status check, cooldown guard.
// Returns the resource if valid, or null after sending an error response.
async function validateResourceForAction(
  resourceId: string | undefined,
  rejectedStatus: 'stopped' | 'running',
  res: Response,
): Promise<Resource | null> {
  let existing: Resource;
  try {
    existing = await getResource(resourceId);
  } catch {
    res.status(404).json({ error: 'Resource not found' });
    return null;
  }

  if (existing.status === rejectedStatus) {
    res.status(409).json({ error: `${existing.name} is already ${rejectedStatus}` });
    return null;
  }

  const remaining = cooldownRemaining(resourceId!);
  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    res.status(429).json({ error: `Cooldown active. Try again in ${Math.floor(secs / 60)}m ${secs % 60}s.` });
    return null;
  }

  return existing;
}

// Shared live-mode gate + adapter action + logging.
// Returns null on success, or an error string on failure.
async function executeAdapterAction(
  existing: Resource,
  resourceId: string,
  source: string | undefined,
  actionVerb: 'stop' | 'start',
  adapterMethod: 'stopResource' | 'startResource',
): Promise<string | null> {
  if (isAwsMode() && !getLiveMode()) {
    const label = actionVerb === 'stop' ? 'Stop' : 'Start';
    await addLog({
      resourceId: existing.id,
      type: 'action',
      message: `[SIMULATION] ${label} simulated for ${existing.name} — Live Mode is OFF`,
    });
    return null;
  }

  try {
    await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_TRIGGERED — ${actionVerb} sent to ${existing.instanceType ?? existing.id}` });
    await getAdapter(source)[adapterMethod](resourceId);
    const pastTense = actionVerb === 'stop' ? 'stopped' : 'started';
    await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_COMPLETED — ${existing.name} ${pastTense} on EC2` });
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_FAILED — ${actionVerb} failed for ${existing.name}: ${message}` });
    return `Failed to ${actionVerb} instance on EC2: ${message}`;
  }
}

export async function postStop(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  const source = req.body?.source as string | undefined;

  const existing = await validateResourceForAction(resourceId, 'stopped', res);
  if (!existing) return;

  const error = await executeAdapterAction(existing, resourceId!, source, 'stop', 'stopResource');
  if (error) { res.status(502).json({ error }); return; }

  const resource = await stopResource(resourceId);
  setLastActionAt(resourceId!);
  const duration = existing.startedAt
    ? ` (was running for ${formatDuration(Date.now() - new Date(existing.startedAt).getTime())})`
    : '';
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} stopped by user${duration}` });
  res.json({ resource, action: { type: 'stop', status: 'completed', triggeredBy: 'user' } });
}

export async function postRestart(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  const source = req.body?.source as string | undefined;

  const existing = await validateResourceForAction(resourceId, 'running', res);
  if (!existing) return;

  const error = await executeAdapterAction(existing, resourceId!, source, 'start', 'startResource');
  if (error) { res.status(502).json({ error }); return; }

  const resource = await restartResource(resourceId);
  setLastActionAt(resourceId!);
  const downtime = existing.stoppedAt
    ? ` (was stopped for ${formatDuration(Date.now() - new Date(existing.stoppedAt).getTime())})`
    : '';
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} restarted${downtime} — monitoring resumed` });
  res.json({ resource, action: { type: 'restart', status: 'completed' } });
}
