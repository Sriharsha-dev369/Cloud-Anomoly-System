import { Metric, Resource } from '../models/types';

export interface CloudAdapter {
  getMetrics(resourceId: string, resource: Resource): Promise<Metric[]>;
  getCost(resourceId: string): Promise<number>;
}
