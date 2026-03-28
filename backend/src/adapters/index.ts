import { CloudAdapter } from './types';
import { mockAdapter } from './mockAdapter';
import { awsAdapter } from './awsAdapter';

export function getAdapter(): CloudAdapter {
  return process.env.DATA_SOURCE === 'aws' ? awsAdapter : mockAdapter;
}
