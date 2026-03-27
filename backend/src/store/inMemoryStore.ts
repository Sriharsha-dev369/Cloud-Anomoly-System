import { Resource, Metric, Anomaly, Action } from '../models/types';

const seedResources: Resource[] = [
  { id: 'res-001', name: 'web-server-01',  status: 'running', costPerHour: 0.50 },
  { id: 'res-002', name: 'api-gateway-01', status: 'running', costPerHour: 1.20 },
  { id: 'res-003', name: 'db-replica-01',  status: 'running', costPerHour: 0.80 },
  { id: 'res-004', name: 'worker-node-01', status: 'running', costPerHour: 0.30 },
];

export const store: {
  resources: Map<string, Resource>;
  stoppedAt: Map<string, string>;
  metrics: Metric[];
  anomalies: Anomaly[];
  actions: Action[];
} = {
  resources: new Map(seedResources.map((r) => [r.id, r])),
  stoppedAt: new Map(),
  metrics: [],
  anomalies: [],
  actions: [],
};

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
  resource.status = 'stopped';
  store.stoppedAt.set(resource.id, new Date().toISOString());
  return resource;
}
