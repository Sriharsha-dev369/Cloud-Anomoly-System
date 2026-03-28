import { SavingsModel } from '../db/SavingsModel';

// Called when an instance is stopped — starts tracking savings for this period.
export async function createSavingsRecord(entry: {
  userId: string;
  resourceId: string;
  instanceType: string;
  costPerHour: number;
  stoppedAt: string;
}): Promise<void> {
  await SavingsModel.create({ ...entry, savedAmount: 0 });
}

// Called when an instance restarts — closes the open record and locks in the saved amount.
export async function finalizeSavingsRecord(
  userId: string,
  resourceId: string,
  resumedAt: string,
): Promise<void> {
  const record = await SavingsModel.findOne({ userId, resourceId, resumedAt: { $exists: false } })
    .sort({ stoppedAt: -1 });
  if (!record) return;

  const hours = Math.max(0, new Date(resumedAt).getTime() - new Date(record.stoppedAt).getTime()) / 3_600_000;
  record.resumedAt = resumedAt;
  record.savedAmount = parseFloat((record.costPerHour * hours).toFixed(4));
  await record.save();
}

// Returns the user's total accumulated savings:
// closed records use their locked savedAmount; open records compute live savings.
export async function getUserTotalSavings(userId: string): Promise<number> {
  const records = await SavingsModel.find({ userId }).lean();
  const total = records.reduce((sum, r) => {
    if (r.resumedAt) return sum + r.savedAmount;
    const hours = Math.max(0, Date.now() - new Date(r.stoppedAt).getTime()) / 3_600_000;
    return sum + parseFloat((r.costPerHour * hours).toFixed(4));
  }, 0);
  return parseFloat(total.toFixed(4));
}
