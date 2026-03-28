import { Resource } from '../models/types';

export interface ResourceImpact {
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
  perResource: ResourceImpact[];
}

export function calculateRunningCost(resource: Resource): number {
  if (!resource.startedAt) return 0;
  const start = new Date(resource.startedAt).getTime();
  const end = resource.stoppedAt ? new Date(resource.stoppedAt).getTime() : Date.now();
  const hours = Math.max(0, end - start) / 3_600_000;
  return parseFloat((resource.costPerHour * hours).toFixed(4));
}

export function calculateSavings(resource: Resource): number {
  if (resource.status !== 'stopped' || !resource.stoppedAt) return 0;
  const hours = Math.max(0, Date.now() - new Date(resource.stoppedAt).getTime()) / 3_600_000;
  return parseFloat((resource.costPerHour * hours).toFixed(4));
}

export function calculateImpact(resources: Resource[]): ImpactSummary {
  const perResource: ResourceImpact[] = resources.map((r) => ({
    id: r.id,
    name: r.name,
    instanceType: r.instanceType ?? 'unknown',
    costPerHour: r.costPerHour,
    runningCost: calculateRunningCost(r),
    savings: calculateSavings(r),
    status: r.status,
  }));
  return {
    totalRunningCost: parseFloat(perResource.reduce((s, r) => s + r.runningCost, 0).toFixed(4)),
    totalSavings: parseFloat(perResource.reduce((s, r) => s + r.savings, 0).toFixed(4)),
    perResource,
  };
}
