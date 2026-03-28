import { Metric } from '../models/types';
import { getResource } from '../store/inMemoryStore';
import { getAdapter } from '../adapters';
import { classifyAwsError } from '../utils/awsRetry';

export async function generateMetrics(resourceId?: string, source?: string, since?: string): Promise<Metric[]> {
  try {
    const resource = await getResource(resourceId);
    return getAdapter(source).getMetrics(resource.id, resource, since);
  } catch (err) {
    const label = classifyAwsError(err);
    console.error(`[metricsService] ${label}: generateMetrics failed for ${resourceId ?? 'default'}: ${(err as Error).message}`);
    return [];
  }
}
