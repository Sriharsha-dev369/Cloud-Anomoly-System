import { CloudAdapter } from './types';
import { mockAdapter } from './mockAdapter';
import { awsAdapter, createUserAwsAdapter } from './awsAdapter';
import { isAwsMode } from '../utils/awsConfig';
import { getAwsCredentials } from '../services/awsCredentialService';

// source='mock' forces mock; source='aws' forces aws; otherwise falls back to DATA_SOURCE env var
export function getAdapter(source?: string): CloudAdapter {
  if (source === 'mock') return mockAdapter;
  if (source === 'aws') return awsAdapter;
  return isAwsMode() ? awsAdapter : mockAdapter;
}

// Returns an adapter scoped to the user's stored AWS credentials.
// Falls back to mockAdapter if the user has no credentials connected.
export async function getAdapterForUser(userId: string): Promise<CloudAdapter> {
  const creds = await getAwsCredentials(userId);
  if (!creds) return mockAdapter;
  return createUserAwsAdapter(creds);
}
