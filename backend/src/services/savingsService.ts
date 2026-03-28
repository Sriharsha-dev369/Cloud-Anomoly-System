import { getResource, getUserResource } from '../store/inMemoryStore';
import { calculateSavings as calcSavings } from './costEngine';

export async function calculateSavings(resourceId?: string, userId?: string): Promise<number> {
  try {
    const resource = userId
      ? await getUserResource(resourceId!, userId)
      : await getResource(resourceId);
    return calcSavings(resource);
  } catch {
    return 0;
  }
}
