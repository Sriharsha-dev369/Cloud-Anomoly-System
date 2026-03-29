import { Metric } from '../models/types';

// In-memory store for metric history per resource
const metricHistory = new Map<string, Metric[]>();

const MAX_HISTORY_POINTS = 50;

/**
 * Adds a new metric datapoint to the history store.
 * Keeps the last N datapoints (MAX_HISTORY_POINTS) to ensure fast access
 * and bounded memory usage.
 * 
 * @param metric The metric to store
 */
export const addMetricToHistory = (metric: Metric): void => {
  if (!metricHistory.has(metric.resourceId)) {
    metricHistory.set(metric.resourceId, []);
  }

  const history = metricHistory.get(metric.resourceId)!;
  history.push(metric);

  // Keep last N datapoints (20-50 based on prompt, we use 50 here)
  if (history.length > MAX_HISTORY_POINTS) {
    history.shift();
  }
};

/**
 * Retrieves the metric history for a specific resource.
 * Ensure fast access.
 * 
 * @param resourceId The ID of the resource
 * @returns Array of historical metrics for the resource
 */
export const getMetricHistory = (resourceId: string): Metric[] => {
  return metricHistory.get(resourceId) || [];
};

/**
 * Clears history for a resource, useful for cleanup if a resource is deleted.
 * 
 * @param resourceId The ID of the resource
 */
export const clearMetricHistory = (resourceId: string): void => {
  metricHistory.delete(resourceId);
};
