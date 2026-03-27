import { Resource, Metric, Anomaly, Action, Log } from '../models/types';

const seedResources: Resource[] = [
  { id: 'res-001', name: 'web-server-01',  status: 'running', costPerHour: 0.50 },
  { id: 'res-002', name: 'api-gateway-01', status: 'running', costPerHour: 1.20 },
  { id: 'res-003', name: 'db-replica-01',  status: 'running', costPerHour: 0.80 },
  { id: 'res-004', name: 'worker-node-01', status: 'running', costPerHour: 0.30 },
];

export const store: {
  resources: Map<string, Resource>;
  stoppedAt: Map<string, string>;
  restartedAt: Map<string, string>;
  metrics: Metric[];
  anomalies: Anomaly[];
  actions: Action[];
  logs: Log[];
  autoMode: boolean;
  loggedAnomalies: Set<string>;
} = {
  resources: new Map(seedResources.map((r) => [r.id, r])),
  stoppedAt: new Map(),
  restartedAt: new Map(),
  metrics: [],
  anomalies: [],
  actions: [],
  logs: [],
  autoMode: false,
  loggedAnomalies: new Set(),
};

export function hasAnomalyBeenLogged(resourceId: string): boolean {
  return store.loggedAnomalies.has(resourceId);
}

export function markAnomalyLogged(resourceId: string): void {
  store.loggedAnomalies.add(resourceId);
}

export function addLog(entry: Omit<Log, 'timestamp'>): void {
  store.logs.push({ timestamp: new Date().toISOString(), ...entry });
}

export function getLogs(): Log[] {
  return store.logs;
}

export function getAutoMode(): boolean {
  return store.autoMode;
}

export function setAutoMode(enabled: boolean): void {
  store.autoMode = enabled;
}

// ── helpers ────────────────────────────────────────────────────────────────

function firstId(): string {
  return store.resources.keys().next().value as string;
}

export function getAllResources(): Resource[] {
  return Array.from(store.resources.values());
}

/** Backward-compat: defaults to first resource when no id supplied */
export function getResource(id?: string): Resource {
  const resource = store.resources.get(id ?? firstId());
  if (!resource) throw new Error(`Resource ${id} not found`);
  return resource;
}

/** Backward-compat: defaults to first resource when no id supplied */
export function stopResource(id?: string): Resource {
  const resource = getResource(id ?? firstId());
  const now = new Date().toISOString();
  resource.status = 'stopped';
  resource.stoppedAt = now;
  store.stoppedAt.set(resource.id, now);
  store.loggedAnomalies.delete(resource.id);
  store.restartedAt.delete(resource.id);
  return resource;
}

export function restartResource(id?: string): Resource {
  const resource = getResource(id ?? firstId());
  resource.status = 'running';
  resource.stoppedAt = undefined;
  store.restartedAt.set(resource.id, new Date().toISOString());
  store.stoppedAt.delete(resource.id);
  return resource;
}

export function getRestartedAt(resourceId: string): string | undefined {
  return store.restartedAt.get(resourceId);
}
