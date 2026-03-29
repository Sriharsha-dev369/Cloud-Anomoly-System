export interface Resource {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  stoppedAt?: string;
  startedAt?: string;
  instanceType?: string;
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
  confidence: number;
  detectedAt: string;
  ruleTriggered?: boolean;
  mlTriggered?: boolean;
  anomalyScore?: number;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  reason?: string;
}

export interface Log {
  timestamp: string;
  resourceId: string;
  type: 'anomaly' | 'action';
  message: string;
}
