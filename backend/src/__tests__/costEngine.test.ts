import { calculateRunningCost, calculateImpact } from '../services/costEngine';
import { Resource } from '../models/types';

const base: Resource = {
  id: 'res-001',
  name: 'web-server-01',
  instanceType: 't3.medium',
  status: 'running',
  costPerHour: 1,
};

describe('calculateRunningCost', () => {
  it('returns 0 when resource has no startedAt', () => {
    expect(calculateRunningCost({ ...base })).toBe(0);
  });

  it('calculates cost for a running resource', () => {
    const startedAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const cost = calculateRunningCost({ ...base, startedAt });
    expect(cost).toBeCloseTo(2, 1);
  });

  it('calculates cost up to stoppedAt for a stopped resource', () => {
    const startedAt = new Date(Date.now() - 3 * 3_600_000).toISOString();
    const stoppedAt = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const cost = calculateRunningCost({ ...base, status: 'stopped', startedAt, stoppedAt });
    expect(cost).toBeCloseTo(2, 1);
  });
});

describe('calculateImpact', () => {
  it('returns zero totals for empty resource list', () => {
    const result = calculateImpact([]);
    expect(result.totalRunningCost).toBe(0);
    expect(result.totalSavings).toBe(0);
    expect(result.perResource).toEqual([]);
  });

  it('sums running costs across multiple resources', () => {
    const startedAt = new Date(Date.now() - 1 * 3_600_000).toISOString();
    const r1: Resource = { ...base, id: 'res-001', costPerHour: 1, startedAt };
    const r2: Resource = { ...base, id: 'res-002', costPerHour: 2, startedAt };
    const result = calculateImpact([r1, r2]);
    expect(result.totalRunningCost).toBeCloseTo(3, 1);
    expect(result.perResource).toHaveLength(2);
  });

  it('uses "unknown" for instanceType when missing', () => {
    const r: Resource = { ...base, instanceType: undefined };
    const result = calculateImpact([r]);
    expect(result.perResource[0].instanceType).toBe('unknown');
  });
});
