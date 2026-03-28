import { Resource, Log } from '../models/types';
import {
  findAllResources,
  findOneResource,
  updateResourceStopped,
  updateResourceRunning,
} from '../repositories/resourceRepository';
import { createLog, findLogs } from '../repositories/logRepository';
import { ResourceDocument } from '../db/ResourceModel';

// ── Runtime state (intentionally resets on server restart) ─────────────────
const runtime = {
  autoMode: false,
  loggedAnomalies: new Set<string>(),
  autoStopped: new Set<string>(),
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

// ── Auto-stop dedup ────────────────────────────────────────────────────────
export function hasAutoStopped(resourceId: string): boolean {
  return runtime.autoStopped.has(resourceId);
}
export function markAutoStopped(resourceId: string): void {
  runtime.autoStopped.add(resourceId);
}

// ── RestartedAt ────────────────────────────────────────────────────────────
export function getRestartedAt(resourceId: string): string | undefined {
  return runtime.restartedAt.get(resourceId);
}

// ── Resource helpers ───────────────────────────────────────────────────────
function toResource(doc: ResourceDocument): Resource {
  return {
    id: doc.resourceId,
    name: doc.name,
    status: doc.status,
    costPerHour: doc.costPerHour,
    stoppedAt: doc.stoppedAt,
  };
}

export async function getAllResources(): Promise<Resource[]> {
  const docs = await findAllResources();
  return docs.map(toResource);
}

export async function getResource(id?: string): Promise<Resource> {
  const doc = await findOneResource(id);
  if (!doc) throw new Error(`Resource ${id ?? 'first'} not found`);
  return toResource(doc);
}

export async function stopResource(id?: string): Promise<Resource> {
  const doc = await updateResourceStopped(id, new Date().toISOString());
  if (!doc) throw new Error(`Resource ${id} not found`);
  runtime.restartedAt.delete(doc.resourceId);
  return toResource(doc);
}

export async function restartResource(id?: string): Promise<Resource> {
  const doc = await updateResourceRunning(id);
  if (!doc) throw new Error(`Resource ${id} not found`);
  runtime.loggedAnomalies.delete(doc.resourceId);
  runtime.autoStopped.delete(doc.resourceId);
  runtime.restartedAt.set(doc.resourceId, new Date().toISOString());
  return toResource(doc);
}

// ── Logs ───────────────────────────────────────────────────────────────────
export async function addLog(entry: Omit<Log, 'timestamp'>): Promise<void> {
  await createLog({ timestamp: new Date().toISOString(), ...entry });
}

export async function getLogs(resourceId?: string): Promise<Log[]> {
  const docs = await findLogs(resourceId);
  return docs.map((d) => ({
    timestamp: d.timestamp,
    resourceId: d.resourceId,
    type: d.type,
    message: d.message,
  }));
}
