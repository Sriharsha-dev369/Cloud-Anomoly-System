import { detectAnomalies } from '../services/anomalyService';
import { Metric } from '../models/types';

function makeMetrics(cpuValues: number[], costValues?: number[]): Metric[] {
  const now = Date.now();
  return cpuValues.map((cpu, i) => ({
    resourceId: 'res-001',
    timestamp: new Date(now - (cpuValues.length - 1 - i) * 60_000).toISOString(),
    cpu,
    cost: costValues ? costValues[i] : i * 0.01,
  }));
}

describe('detectAnomalies', () => {
  it('returns [] for empty metrics', () => {
    expect(detectAnomalies([])).toEqual([]);
  });

  it('returns [] when fewer than 10 data points', () => {
    const metrics = makeMetrics([1, 1, 1, 2, 1, 2, 1, 1, 1]); // 9 points
    expect(detectAnomalies(metrics)).toEqual([]);
  });

  it('returns [] when no anomaly in last 10 points', () => {
    const cpu = Array(60).fill(70); // normal CPU across all 60 mins
    expect(detectAnomalies(makeMetrics(cpu))).toEqual([]);
  });

  it('detects low_usage when last 10 all have cpu < 5% and cost is increasing', () => {
    const cpu = [...Array(50).fill(70), ...Array(10).fill(2)]; // drops in last 10
    const cost = cpu.map((_, i) => i * 0.01); // steadily increasing
    const result = detectAnomalies(makeMetrics(cpu, cost));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'low_usage', resourceId: 'res-001' });
    expect(result[0].confidence).toBeGreaterThan(0);
    expect(result[0].confidence).toBeLessThanOrEqual(1);
  });

  it('does not flag low_usage when cost is flat (resource already stopped)', () => {
    const cpu = [...Array(50).fill(70), ...Array(10).fill(2)];
    const cost = cpu.map(() => 0.5); // flat cost
    expect(detectAnomalies(makeMetrics(cpu, cost))).toEqual([]);
  });

  it('does not flag low_usage when cost is decreasing', () => {
    const cpu = [...Array(50).fill(70), ...Array(10).fill(2)];
    const cost = cpu.map((_, i) => 1 - i * 0.01); // decreasing
    expect(detectAnomalies(makeMetrics(cpu, cost))).toEqual([]);
  });

  it('detects spike_usage when last 10 all have cpu > 90%', () => {
    const cpu = [...Array(50).fill(70), ...Array(10).fill(95)];
    const result = detectAnomalies(makeMetrics(cpu));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'spike_usage', resourceId: 'res-001' });
    expect(result[0].confidence).toBeGreaterThan(0);
    expect(result[0].confidence).toBeLessThanOrEqual(1);
  });

  it('does not flag spike_usage when only 9 of last 10 are above 90%', () => {
    const cpu = [...Array(50).fill(70), 70, ...Array(9).fill(95)]; // 9 high, not 10
    expect(detectAnomalies(makeMetrics(cpu))).toEqual([]);
  });

  it('detects anomaly with exactly 10 data points (minimum window)', () => {
    const cpu = Array(10).fill(2);
    const cost = cpu.map((_, i) => i * 0.01);
    const result = detectAnomalies(makeMetrics(cpu, cost));
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('low_usage');
  });

  it('checks low_usage before spike_usage', () => {
    // cpu values satisfy low_usage (< 5%) — spike check is never reached
    const cpu = [...Array(50).fill(70), ...Array(10).fill(2)];
    const cost = cpu.map((_, i) => i * 0.01);
    const result = detectAnomalies(makeMetrics(cpu, cost));
    expect(result[0].type).toBe('low_usage');
  });
});
