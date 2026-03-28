import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { EC2Client } from '@aws-sdk/client-ec2';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export function createEc2Client(creds: AwsCredentials): EC2Client {
  return new EC2Client({
    region: creds.region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

export function createCloudWatchClient(creds: AwsCredentials): CloudWatchClient {
  return new CloudWatchClient({
    region: creds.region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}
