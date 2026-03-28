import { ResourceDocument, ResourceModel } from '../db/ResourceModel';

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
    { $set: { status: 'running' }, $unset: { stoppedAt: '' } },
    { returnDocument: 'after', sort: { resourceId: 1 } }
  );
}

export async function countResources(): Promise<number> {
  return ResourceModel.countDocuments();
}

export async function insertResources(resources: object[]): Promise<void> {
  await ResourceModel.insertMany(resources);
}
