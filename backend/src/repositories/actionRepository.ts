import { ActionModel, ActionDocument } from '../db/ActionModel';

export async function createAction(entry: {
  userId: string;
  resourceId: string;
  action: 'stop' | 'restart';
  status: 'completed' | 'failed';
}): Promise<void> {
  await ActionModel.create({ ...entry, timestamp: new Date().toISOString() });
}

export async function findActionsByUser(
  userId: string,
  resourceId?: string,
): Promise<ActionDocument[]> {
  const filter: Record<string, string> = { userId };
  if (resourceId) filter.resourceId = resourceId;
  return ActionModel.find(filter).sort({ timestamp: -1 }).lean() as unknown as Promise<ActionDocument[]>;
}
