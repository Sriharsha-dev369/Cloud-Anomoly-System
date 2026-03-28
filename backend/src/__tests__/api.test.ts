import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { generateMetrics } from '../services/metricsService';
import { getResource, stopResource, addLog } from '../store/inMemoryStore';
import { calculateSavings } from '../services/savingsService';

jest.mock('../services/metricsService');
jest.mock('../store/inMemoryStore');
jest.mock('../services/savingsService');

const mockGenerateMetrics = jest.mocked(generateMetrics);
const mockGetResource = jest.mocked(getResource);
const mockStopResource = jest.mocked(stopResource);
const mockAddLog = jest.mocked(addLog);
const mockCalculateSavings = jest.mocked(calculateSavings);

const JWT_SECRET = 'cloud-anomaly-demo-secret';
const authToken = jwt.sign({ username: 'admin' }, JWT_SECRET);

const runningResource = { id: 'res-001', name: 'web-server-01', status: 'running' as const, costPerHour: 0.5 };
const stoppedResource = { ...runningResource, status: 'stopped' as const, stoppedAt: '2026-03-28T11:00:00Z' };

describe('GET /metrics', () => {
  it('returns an array of 60 metric data points', async () => {
    const fakeMetrics = Array.from({ length: 60 }, (_, i) => ({
      resourceId: 'res-001',
      timestamp: new Date(Date.now() - i * 60_000).toISOString(),
      cpu: 70,
      cost: i * 0.01,
    }));
    mockGenerateMetrics.mockResolvedValue(fakeMetrics);

    const res = await request(app).get('/metrics?resourceId=res-001');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(60);
    expect(res.body[0]).toMatchObject({ resourceId: 'res-001', cpu: 70 });
  });
});

describe('POST /action/stop', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/action/stop')
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .post('/action/stop')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(401);
  });

  it('stops a running resource and returns action with triggeredBy user', async () => {
    mockGetResource.mockResolvedValue(runningResource);
    mockStopResource.mockResolvedValue(stoppedResource);
    mockAddLog.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/action/stop')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(200);
    expect(res.body.resource.status).toBe('stopped');
    expect(res.body.action.type).toBe('stop');
    expect(res.body.action.triggeredBy).toBe('user');
  });

  it('returns 409 when resource is already stopped', async () => {
    mockGetResource.mockResolvedValue(stoppedResource);

    const res = await request(app)
      .post('/action/stop')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Resource is already stopped');
  });
});

describe('GET /savings', () => {
  it('returns savings amount for a stopped resource', async () => {
    mockCalculateSavings.mockResolvedValue(1.25);

    const res = await request(app).get('/savings?resourceId=res-001');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ savings: 1.25 });
  });

  it('returns 0 when resource is running', async () => {
    mockCalculateSavings.mockResolvedValue(0);

    const res = await request(app).get('/savings?resourceId=res-001');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ savings: 0 });
  });
});
