import { Request, Response } from 'express';
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

const AWS_COOLDOWN_MS = 5 * 60 * 1000;  // 5 minutes — real EC2 needs time
const MOCK_COOLDOWN_MS = 30 * 1000;     // 30 seconds — simulation is instant
const COOLDOWN_MS = process.env.DATA_SOURCE === 'aws' ? AWS_COOLDOWN_MS : MOCK_COOLDOWN_MS;

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

export async function postStop(req: Request, res: Response): Promise<void> {
  const resourceId = req.body?.resourceId as string | undefined;
  const source = req.body?.source as string | undefined;

  let existing: Awaited<ReturnType<typeof getResource>>;
  try {
    existing = await getResource(resourceId);
  } catch {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  if (existing.status === 'stopped') {
    res.status(409).json({ error: `${existing.name} is already stopped` });
    return;
  }

  // Cooldown guard
  const remaining = cooldownRemaining(resourceId!);
  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    res.status(429).json({ error: `Cooldown active. Try again in ${Math.floor(secs / 60)}m ${secs % 60}s.` });
    return;
  }

  // LiveMode gate — skip real AWS action if liveMode is OFF
  const awsMode = process.env.DATA_SOURCE === 'aws';
  if (awsMode && !getLiveMode()) {
    await addLog({
      resourceId: existing.id,
      type: 'action',
      message: `[SIMULATION] Stop simulated for ${existing.name} — Live Mode is OFF`,
    });
  } else {
    try {
      await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_TRIGGERED — stop sent to ${existing.instanceType ?? existing.id}` });
      await getAdapter(source).stopResource(resourceId!);
      await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_COMPLETED — ${existing.name} stopped on EC2` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_FAILED — stop failed for ${existing.name}: ${message}` });
      res.status(502).json({ error: `Failed to stop instance on EC2: ${message}` });
      return;
    }
  }

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

  let existing: Awaited<ReturnType<typeof getResource>>;
  try {
    existing = await getResource(resourceId);
  } catch {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  if (existing.status === 'running') {
    res.status(409).json({ error: `${existing.name} is already running` });
    return;
  }

  // Cooldown guard
  const remaining = cooldownRemaining(resourceId!);
  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    res.status(429).json({ error: `Cooldown active. Try again in ${Math.floor(secs / 60)}m ${secs % 60}s.` });
    return;
  }

  // LiveMode gate — skip real AWS action if liveMode is OFF
  const awsMode = process.env.DATA_SOURCE === 'aws';
  if (awsMode && !getLiveMode()) {
    await addLog({
      resourceId: existing.id,
      type: 'action',
      message: `[SIMULATION] Start simulated for ${existing.name} — Live Mode is OFF`,
    });
  } else {
    try {
      await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_TRIGGERED — start sent to ${existing.instanceType ?? existing.id}` });
      await getAdapter(source).startResource(resourceId!);
      await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_COMPLETED — ${existing.name} started on EC2` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await addLog({ resourceId: existing.id, type: 'action', message: `AWS_ACTION_FAILED — start failed for ${existing.name}: ${message}` });
      res.status(502).json({ error: `Failed to start instance on EC2: ${message}` });
      return;
    }
  }

  const resource = await restartResource(resourceId);
  setLastActionAt(resourceId!);
  const downtime = existing.stoppedAt
    ? ` (was stopped for ${formatDuration(Date.now() - new Date(existing.stoppedAt).getTime())})`
    : '';
  await addLog({ resourceId: resource.id, type: 'action', message: `${resource.name} restarted${downtime} — monitoring resumed` });
  res.json({ resource, action: { type: 'restart', status: 'completed' } });
}
