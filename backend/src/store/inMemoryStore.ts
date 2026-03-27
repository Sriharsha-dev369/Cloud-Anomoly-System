import { Resource, Log } from '../models/types';
import { ResourceModel } from '../db/ResourceModel';
import { LogModel } from '../db/LogModel';

// ── Runtime state (intentionally resets on server restart) ─────────────────
const runtime = {
  autoMode: false,
  loggedAnomalies: new Set<string>(),
  restartedAt: new Map<string, string>(),
};

// ── AutoMode ───────────────────────────────────────────────────────────────
export function getAutoMode(): boolean { return runtime.autoMode; }
export function setAutoMode(enabled: boolean): void { runtime.autoMode = enabled; }

// ── Anomaly dedup ──────────────────────────────────────────────────────────
export function hasAnomalyBeenLogged(resourceId: string): boolean {
  return runtime.loggedAnomalies.has(resourceId);
}
export function markAnomalyLogged(resourceId: string): void {
  runtime.loggedAnomalies.add(resourceId);
}

// ── RestartedAt ────────────────────────────────────────────────────────────
export function getRestartedAt(resourceId: string): string | undefined {
  return runtime.restartedAt.get(resourceId);
}

// ── Resource helpers ───────────────────────────────────────────────────────
function toResource(doc: InstanceType<typeof ResourceModel>): Resource {
  return {
    id: doc.resourceId,
    name: doc.name,
    status: doc.status,
    costPerHour: doc.costPerHour,
    stoppedAt: doc.stoppedAt,
  };
}

export async function getAllResources(): Promise<Resource[]> {
  const docs = await ResourceModel.find().sort({ resourceId: 1 });
  return docs.map(toResource);
}

export async function getResource(id?: string): Promise<Resource> {
  const doc = id
    ? await ResourceModel.findOne({ resourceId: id })
    : await ResourceModel.findOne().sort({ resourceId: 1 });
  if (!doc) throw new Error(`Resource ${id ?? 'first'} not found`);
  return toResource(doc);
}

export async function stopResource(id?: string): Promise<Resource> {
  const now = new Date().toISOString();
  const filter = id ? { resourceId: id } : {};
  const doc = await ResourceModel.findOneAndUpdate(
    filter,
    { $set: { status: 'stopped', stoppedAt: now } },
    { new: true, sort: { resourceId: 1 } }
  );
  if (!doc) throw new Error(`Resource ${id} not found`);
  runtime.loggedAnomalies.delete(doc.resourceId);
  runtime.restartedAt.delete(doc.resourceId);
  return toResource(doc);
}

export async function restartResource(id?: string): Promise<Resource> {
  const filter = id ? { resourceId: id } : {};
  const doc = await ResourceModel.findOneAndUpdate(
    filter,
    { $set: { status: 'running' }, $unset: { stoppedAt: '' } },
    { new: true, sort: { resourceId: 1 } }
  );
  if (!doc) throw new Error(`Resource ${id} not found`);
  runtime.restartedAt.set(doc.resourceId, new Date().toISOString());
  return toResource(doc);
}

// ── Logs ───────────────────────────────────────────────────────────────────
export async function addLog(entry: Omit<Log, 'timestamp'>): Promise<void> {
  await LogModel.create({ timestamp: new Date().toISOString(), ...entry });
}

export async function getLogs(resourceId?: string): Promise<Log[]> {
  const filter = resourceId ? { resourceId } : {};
  const docs = await LogModel.find(filter).sort({ timestamp: -1 });
  return docs.map((d) => ({
    timestamp: d.timestamp,
    resourceId: d.resourceId,
    type: d.type,
    message: d.message,
  }));
}
