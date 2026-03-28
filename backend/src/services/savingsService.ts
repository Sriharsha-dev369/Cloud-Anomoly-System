import { getResource } from '../store/inMemoryStore';
import { calculateSavings as calcSavings } from './costEngine';

export async function calculateSavings(resourceId?: string): Promise<number> {
  try {
    const resource = await getResource(resourceId);
    return calcSavings(resource);
  } catch {
    return 0;
  }
}
