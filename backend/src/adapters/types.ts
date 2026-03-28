import { Metric, Resource } from '../models/types';

export interface CloudAdapter {
  getMetrics(resourceId: string, resource: Resource, since?: string): Promise<Metric[]>;
  getCost(resourceId: string): Promise<number>;
}
