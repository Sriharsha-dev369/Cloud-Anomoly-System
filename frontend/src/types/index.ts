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
  detectedAt: string;
  ruleTriggered?: boolean;
  mlTriggered?: boolean;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence?: number;
  anomalyScore?: number;
  reason?: string;
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

export interface ImpactResource {
  id: string;
  name: string;
  instanceType: string;
  costPerHour: number;
  runningCost: number;
  savings: number;
  status: string;
}

export interface ImpactSummary {
  totalRunningCost: number;
  totalSavings: number;
  perResource: ImpactResource[];
}
