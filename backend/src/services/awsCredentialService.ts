import { DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { UserModel } from '../db/UserModel';
import { encrypt, decrypt } from '../utils/encryption';
import { AWS_REGION } from '../utils/awsConfig';
import { createEc2Client, AwsCredentials } from '../utils/awsClientFactory';

// Validates credentials with a lightweight EC2 call, then stores encrypted in DB.
export async function connectAwsCredentials(
  userId: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string = AWS_REGION,
): Promise<void> {
  const ec2 = createEc2Client({ accessKeyId, secretAccessKey, region });
  // DescribeRegions is the simplest EC2 call to verify credentials work.
  await ec2.send(new DescribeRegionsCommand({ RegionNames: [region] }));

  await UserModel.findByIdAndUpdate(userId, {
    awsAccessKeyId: accessKeyId,
    awsSecretAccessKey: encrypt(secretAccessKey),
    awsRegion: region,
  });
}

// Returns all user IDs that have connected AWS credentials.
export async function getAllConnectedUserIds(): Promise<string[]> {
  const users = await UserModel.find({ awsAccessKeyId: { $exists: true, $ne: null } }, '_id').lean();
  return users.map((u) => (u._id as { toString(): string }).toString());
}

// Returns decrypted credentials for a user, or null if none stored.
export async function getAwsCredentials(userId: string): Promise<AwsCredentials | null> {
  const user = await UserModel.findById(userId);
  if (!user?.awsAccessKeyId || !user?.awsSecretAccessKey) return null;
  return {
    accessKeyId: user.awsAccessKeyId,
    secretAccessKey: decrypt(user.awsSecretAccessKey),
    region: user.awsRegion ?? AWS_REGION,
  };
}
