import { Metric } from '../models/types';
import { getResource } from '../store/inMemoryStore';
import { getAdapter } from '../adapters';

export async function generateMetrics(resourceId?: string): Promise<Metric[]> {
  const resource = await getResource(resourceId);
  return getAdapter().getMetrics(resource.id, resource);
}
