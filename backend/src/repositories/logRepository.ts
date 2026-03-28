import { LogDocument, LogModel } from '../db/LogModel';

export async function createLog(entry: {
  timestamp: string;
  resourceId: string;
  type: 'anomaly' | 'action';
  message: string;
}): Promise<void> {
  await LogModel.create(entry);
}

export async function findLogs(resourceId?: string): Promise<LogDocument[]> {
  const filter = resourceId ? { resourceId } : {};
  return LogModel.find(filter).sort({ timestamp: -1 });
}

export async function countLogs(): Promise<number> {
  return LogModel.countDocuments();
}
