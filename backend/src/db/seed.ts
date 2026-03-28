import { countResources, insertResources, migrateResourceFields, clearEC2Resources } from '../repositories/resourceRepository';
import { countLogs, createLog, clearEC2Logs } from '../repositories/logRepository';
import { syncEC2Instances } from '../services/awsDiscovery';

const seedResources = [
  { resourceId: 'res-001', name: 'web-server-01',  status: 'running', costPerHour: 0.50, instanceType: 't3.small' },
  { resourceId: 'res-002', name: 'api-gateway-01', status: 'running', costPerHour: 1.20, instanceType: 'm5.medium' },
  { resourceId: 'res-003', name: 'db-replica-01',  status: 'running', costPerHour: 0.80, instanceType: 'r5.large' },
  { resourceId: 'res-004', name: 'worker-node-01', status: 'running', costPerHour: 0.30, instanceType: 't3.micro' },
  { resourceId: 'res-005', name: 'ml-training-01', status: 'running', costPerHour: 2.50, instanceType: 'p3.xlarge' },
];

const seedLogs: Array<{ resourceId: string; type: 'action' | 'anomaly'; message: string }> = [
  { resourceId: 'res-001', type: 'action', message: 'web-server-01 provisioned and started' },
  { resourceId: 'res-002', type: 'action', message: 'api-gateway-01 provisioned and started' },
  { resourceId: 'res-003', type: 'action', message: 'db-replica-01 provisioned and started' },
  { resourceId: 'res-004', type: 'action', message: 'worker-node-01 provisioned and started' },
  { resourceId: 'res-005', type: 'action', message: 'ml-training-01 provisioned and started' },
];

export async function seed(): Promise<void> {
  if (process.env.DATA_SOURCE === 'aws') {
    await syncEC2Instances();
    return;
  }

  // Remove any EC2 instances left over from a previous AWS mode run
  await clearEC2Resources();
  await clearEC2Logs();

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

  await migrateResourceFields();
}
