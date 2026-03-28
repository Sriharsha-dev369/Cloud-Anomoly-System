import { CloudAdapter } from './types';
import { mockAdapter } from './mockAdapter';
import { awsAdapter } from './awsAdapter';

// source='mock' forces mock; source='aws' forces aws; otherwise falls back to DATA_SOURCE env var
export function getAdapter(source?: string): CloudAdapter {
  if (source === 'mock') return mockAdapter;
  if (source === 'aws') return awsAdapter;
  return process.env.DATA_SOURCE === 'aws' ? awsAdapter : mockAdapter;
}
