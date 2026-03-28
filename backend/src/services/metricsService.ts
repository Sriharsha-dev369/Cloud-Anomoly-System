import { Metric } from '../models/types';
import { getResource } from '../store/inMemoryStore';
import { getAdapter } from '../adapters';

export async function generateMetrics(resourceId?: string, source?: string): Promise<Metric[]> {
  const resource = await getResource(resourceId);
  return getAdapter(source).getMetrics(resource.id, resource);
}
