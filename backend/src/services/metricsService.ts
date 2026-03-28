import { Metric } from '../models/types';
import { getResource } from '../store/inMemoryStore';
import { getAdapter } from '../adapters';

export async function generateMetrics(resourceId?: string, source?: string, since?: string): Promise<Metric[]> {
  try {
    const resource = await getResource(resourceId);
    return getAdapter(source).getMetrics(resource.id, resource, since);
  } catch {
    return [];
  }
}
