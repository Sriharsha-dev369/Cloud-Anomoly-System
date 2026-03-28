import { ResourceDocument, ResourceModel } from '../db/ResourceModel';

const INSTANCE_TYPE_MAP: Record<string, string> = {
  'res-001': 't3.small',
  'res-002': 'm5.medium',
  'res-003': 'r5.large',
  'res-004': 't3.micro',
  'res-005': 'p3.xlarge',
};

export async function migrateResourceFields(): Promise<void> {
  const sixHoursAgo = new Date(Date.now() - 6 * 3_600_000).toISOString();
  for (const [resourceId, instanceType] of Object.entries(INSTANCE_TYPE_MAP)) {
    await ResourceModel.updateOne(
      { resourceId, instanceType: { $exists: false } },
      { $set: { instanceType } }
    );
    await ResourceModel.updateOne(
      { resourceId, startedAt: { $exists: false }, status: 'running' },
      { $set: { startedAt: sixHoursAgo } }
    );
  }
}

export async function findAllResources(): Promise<ResourceDocument[]> {
  return ResourceModel.find().sort({ resourceId: 1 });
}

export async function findOneResource(id?: string): Promise<ResourceDocument | null> {
  return id
    ? ResourceModel.findOne({ resourceId: id })
    : ResourceModel.findOne().sort({ resourceId: 1 });
}

export async function updateResourceStopped(
  id: string | undefined,
  stoppedAt: string
): Promise<ResourceDocument | null> {
  return ResourceModel.findOneAndUpdate(
    id ? { resourceId: id } : {},
    { $set: { status: 'stopped', stoppedAt } },
    { returnDocument: 'after', sort: { resourceId: 1 } }
  );
}

export async function updateResourceRunning(
  id: string | undefined
): Promise<ResourceDocument | null> {
  return ResourceModel.findOneAndUpdate(
    id ? { resourceId: id } : {},
    { $set: { status: 'running', startedAt: new Date().toISOString() }, $unset: { stoppedAt: '' } },
    { returnDocument: 'after', sort: { resourceId: 1 } }
  );
}

export async function upsertResource(data: {
  resourceId: string;
  name: string;
  instanceType: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  startedAt?: string;
}): Promise<void> {
  const { resourceId, startedAt, ...fields } = data;

  const update: Record<string, unknown> = { $set: fields };

  if (data.status === 'running') {
    update.$unset = { stoppedAt: '' };
    if (startedAt) update.$setOnInsert = { startedAt };
  }

  await ResourceModel.updateOne({ resourceId }, update, { upsert: true });
}

export async function clearSeedResources(): Promise<void> {
  await ResourceModel.deleteMany({ resourceId: /^res-/ });
}

export async function clearEC2Resources(): Promise<void> {
  await ResourceModel.deleteMany({ resourceId: /^i-/ });
}

// ── User-scoped resource functions ──────────────────────────────────────────

export async function findResourcesByUser(userId: string): Promise<ResourceDocument[]> {
  return ResourceModel.find({ userId }).sort({ resourceId: 1 });
}

export async function upsertUserResource(data: {
  resourceId: string;
  userId: string;
  name: string;
  instanceType: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  startedAt?: string;
}): Promise<void> {
  const { resourceId, startedAt, ...fields } = data;

  const update: Record<string, unknown> = { $set: fields };

  if (data.status === 'running') {
    update.$unset = { stoppedAt: '' };
    if (startedAt) update.$setOnInsert = { startedAt };
  }

  await ResourceModel.updateOne({ resourceId }, update, { upsert: true });
}

export async function countResources(): Promise<number> {
  return ResourceModel.countDocuments();
}

export async function insertResources(resources: object[]): Promise<void> {
  await ResourceModel.insertMany(resources);
}
