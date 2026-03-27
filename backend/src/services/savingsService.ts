import { store, getResource } from '../store/inMemoryStore';

export function calculateSavings(resourceId?: string): number {
  const resource = getResource(resourceId);
  if (resource.status !== 'stopped') return 0;

  const stoppedAt = store.stoppedAt.get(resource.id);
  if (!stoppedAt) return 0;

  const hoursStopped = (Date.now() - new Date(stoppedAt).getTime()) / 3_600_000;
  return parseFloat((resource.costPerHour * hoursStopped).toFixed(4));
}
