import { CloudAdapter } from './types';
import { mockAdapter } from './mockAdapter';
import { awsAdapter } from './awsAdapter';

// source='mock' always forces mock regardless of DATA_SOURCE env var
export function getAdapter(source?: string): CloudAdapter {
  if (source === 'mock') return mockAdapter;
  return process.env.DATA_SOURCE === 'aws' ? awsAdapter : mockAdapter;
}
