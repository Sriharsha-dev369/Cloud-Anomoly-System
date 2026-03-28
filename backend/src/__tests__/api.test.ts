import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { generateMetrics } from '../services/metricsService';
import { getResource, stopResource, restartResource, addLog } from '../store/inMemoryStore';
import { calculateSavings } from '../services/savingsService';

jest.mock('../services/metricsService');
jest.mock('../store/inMemoryStore');
jest.mock('../services/savingsService');

const mockGenerateMetrics = jest.mocked(generateMetrics);
const mockGetResource = jest.mocked(getResource);
const mockStopResource = jest.mocked(stopResource);
const mockRestartResource = jest.mocked(restartResource);
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
    expect(res.body.error).toBe('web-server-01 is already stopped');
  });

  it('returns 404 when resource is not found', async () => {
    mockGetResource.mockRejectedValue(new Error('Resource unknown not found'));

    const res = await request(app)
      .post('/action/stop')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resourceId: 'unknown' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Resource not found');
  });
});

describe('POST /action/restart', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/action/restart')
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .post('/action/restart')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(401);
  });

  it('restarts a stopped resource', async () => {
    mockGetResource.mockResolvedValue(stoppedResource);
    mockRestartResource.mockResolvedValue(runningResource);
    mockAddLog.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/action/restart')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(200);
    expect(res.body.resource.status).toBe('running');
    expect(res.body.action.type).toBe('restart');
  });

  it('returns 409 when resource is already running', async () => {
    mockGetResource.mockResolvedValue(runningResource);

    const res = await request(app)
      .post('/action/restart')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resourceId: 'res-001' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('web-server-01 is already running');
  });

  it('returns 404 when resource is not found', async () => {
    mockGetResource.mockRejectedValue(new Error('Resource unknown not found'));

    const res = await request(app)
      .post('/action/restart')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ resourceId: 'unknown' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Resource not found');
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
