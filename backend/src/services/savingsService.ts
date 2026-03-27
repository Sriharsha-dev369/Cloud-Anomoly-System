import { getResource } from '../store/inMemoryStore';

export async function calculateSavings(resourceId?: string): Promise<number> {
  const resource = await getResource(resourceId);
  if (resource.status !== 'stopped' || !resource.stoppedAt) return 0;
  const hoursStopped = (Date.now() - new Date(resource.stoppedAt).getTime()) / 3_600_000;
  return parseFloat((resource.costPerHour * hoursStopped).toFixed(4));
}
