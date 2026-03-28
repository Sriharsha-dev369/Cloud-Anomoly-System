import { countResources, insertResources } from '../repositories/resourceRepository';
import { countLogs, createLog } from '../repositories/logRepository';

const seedResources = [
  { resourceId: 'res-001', name: 'web-server-01',  status: 'running', costPerHour: 0.50 },
  { resourceId: 'res-002', name: 'api-gateway-01', status: 'running', costPerHour: 1.20 },
  { resourceId: 'res-003', name: 'db-replica-01',  status: 'running', costPerHour: 0.80 },
  { resourceId: 'res-004', name: 'worker-node-01', status: 'running', costPerHour: 0.30 },
  { resourceId: 'res-005', name: 'ml-training-01', status: 'running', costPerHour: 2.50 },
];

const seedLogs: Array<{ resourceId: string; type: 'action' | 'anomaly'; message: string }> = [
  { resourceId: 'res-001', type: 'action', message: 'web-server-01 provisioned and started' },
  { resourceId: 'res-002', type: 'action', message: 'api-gateway-01 provisioned and started' },
  { resourceId: 'res-003', type: 'action', message: 'db-replica-01 provisioned and started' },
  { resourceId: 'res-004', type: 'action', message: 'worker-node-01 provisioned and started' },
  { resourceId: 'res-005', type: 'action', message: 'ml-training-01 provisioned and started' },
];

export async function seed(): Promise<void> {
  const resourceCount = await countResources();
  if (resourceCount === 0) {
    await insertResources(seedResources);
    console.log('Seeded resources');
  }

  const logCount = await countLogs();
  if (logCount === 0) {
    const now = new Date().toISOString();
    for (const entry of seedLogs) {
      await createLog({ timestamp: now, ...entry });
    }
    console.log('Seeded initial logs');
  }
}
