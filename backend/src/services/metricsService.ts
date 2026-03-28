import { Metric } from '../models/types';
import { getResource, getUserResource } from '../store/inMemoryStore';
import { getAdapter, getAdapterForUser } from '../adapters';
import { classifyAwsError } from '../utils/awsRetry';

export async function generateMetrics(
  resourceId?: string,
  source?: string,
  since?: string,
  userId?: string,
): Promise<Metric[]> {
  try {
    const resource = userId
      ? await getUserResource(resourceId!, userId)
      : await getResource(resourceId);
    const adapter = userId
      ? await getAdapterForUser(userId)
      : getAdapter(source);
    return adapter.getMetrics(resource.id, resource, since);
  } catch (err) {
    const label = classifyAwsError(err);
    console.error(`[metricsService] ${label}: generateMetrics failed for ${resourceId ?? 'default'}: ${(err as Error).message}`);
    return [];
  }
}
