export interface Resource {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
}

export interface Metric {
  resourceId: string;
  timestamp: string;
  cpu: number;
  cost: number;
}

export interface Anomaly {
  resourceId: string;
  reason: 'low_usage';
  detectedAt: string;
}

export interface Action {
  resourceId: string;
  type: 'stop';
  status: 'pending' | 'completed';
}
