import { Metric, Resource } from '../models/types';

export interface CloudAdapter {
  getMetrics(resourceId: string, resource: Resource, since?: string): Promise<Metric[]>;
  stopResource(resourceId: string): Promise<void>;
  startResource(resourceId: string): Promise<void>;
}
