export interface Resource {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  stoppedAt?: string;
}

export interface Metric {
  resourceId: string;
  timestamp: string;
  cpu: number;
  cost: number;
}

export interface Anomaly {
  resourceId: string;
  type: 'low_usage' | 'spike_usage';
  detectedAt: string;
}

export interface Action {
  resourceId: string;
  type: 'stop';
  status: 'pending' | 'completed';
  triggeredBy: 'user' | 'system';
}

export interface Log {
  timestamp: string;
  resourceId: string;
  type: 'anomaly' | 'action';
  message: string;
}
