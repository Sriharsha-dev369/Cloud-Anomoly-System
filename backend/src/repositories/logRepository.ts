import { LogDocument, LogModel } from '../db/LogModel';

export async function createLog(entry: {
  timestamp: string;
  resourceId: string;
  type: 'anomaly' | 'action';
  message: string;
}): Promise<void> {
  await LogModel.create(entry);
}

export async function findLogs(resourceId?: string, since?: string): Promise<LogDocument[]> {
  const filter: Record<string, unknown> = resourceId ? { resourceId } : {};
  if (since) filter.timestamp = { $gt: since };
  return LogModel.find(filter).sort({ timestamp: -1 });
}

// Returns logs whose resourceId is in the provided list (for user-scoped queries).
export async function findLogsByResourceIds(
  resourceIds: string[],
  since?: string,
): Promise<LogDocument[]> {
  if (resourceIds.length === 0) return [];
  const filter: Record<string, unknown> = { resourceId: { $in: resourceIds } };
  if (since) filter.timestamp = { $gt: since };
  return LogModel.find(filter).sort({ timestamp: -1 });
}

export async function clearSeedLogs(): Promise<void> {
  await LogModel.deleteMany({ resourceId: /^res-/ });
}

export async function clearEC2Logs(): Promise<void> {
  await LogModel.deleteMany({ resourceId: /^i-/ });
}

export async function countLogs(): Promise<number> {
  return LogModel.countDocuments();
}
