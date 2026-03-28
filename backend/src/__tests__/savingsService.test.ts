import { calculateSavings } from '../services/savingsService';
import { getResource } from '../store/inMemoryStore';

jest.mock('../store/inMemoryStore');

const mockGetResource = jest.mocked(getResource);

const BASE_TIME = new Date('2026-03-28T12:00:00Z').getTime();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(BASE_TIME);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('calculateSavings', () => {
  it('returns 0 when resource is running', async () => {
    mockGetResource.mockResolvedValue({
      id: 'res-001', name: 'web-server-01', status: 'running', costPerHour: 0.5,
    });
    expect(await calculateSavings('res-001')).toBe(0);
  });

  it('returns 0 when stopped but stoppedAt is missing', async () => {
    mockGetResource.mockResolvedValue({
      id: 'res-001', name: 'web-server-01', status: 'stopped', costPerHour: 0.5,
    });
    expect(await calculateSavings('res-001')).toBe(0);
  });

  it('returns correct savings after 1 hour stopped', async () => {
    mockGetResource.mockResolvedValue({
      id: 'res-001', name: 'web-server-01', status: 'stopped', costPerHour: 0.5,
      stoppedAt: new Date(BASE_TIME - 3_600_000).toISOString(), // exactly 1h ago
    });
    expect(await calculateSavings('res-001')).toBe(0.5);
  });

  it('returns correct savings after 2 hours stopped', async () => {
    mockGetResource.mockResolvedValue({
      id: 'res-001', name: 'web-server-01', status: 'stopped', costPerHour: 1.2,
      stoppedAt: new Date(BASE_TIME - 2 * 3_600_000).toISOString(), // 2h ago
    });
    expect(await calculateSavings('res-001')).toBe(2.4);
  });

  it('rounds to 4 decimal places', async () => {
    mockGetResource.mockResolvedValue({
      id: 'res-001', name: 'web-server-01', status: 'stopped', costPerHour: 0.3,
      stoppedAt: new Date(BASE_TIME - 3_600_000).toISOString(),
    });
    const result = await calculateSavings('res-001');
    expect(result).toBe(0.3);
    expect(result.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });
});
