import { Metric } from '../models/types';

/**
 * Builds feature vectors per datapoint from a history of metrics.
 * Uses the last N points (up to 50) as specified in Phase 2.
 * 
 * Feature array template:
 * [
 *   cpu,
 *   cost,
 *   costChangeRate,
 *   cpuToCostRatio
 * ]
 * 
 * @param history Array of historical Metric data for a resource. Must be ordered chronologically.
 * @returns Array of feature arrays (number[][]).
 */
export const buildFeatureVectors = (history: Metric[]): number[][] => {
  if (!history || history.length === 0) {
    return [];
  }

  // Use last N points (up to 50)
  const relevantHistory = history.slice(-50);

  return relevantHistory.map((currentMetric, index) => {
    // For the first point in our slice, costChangeRate is 0 if there's no previous history
    // Alternatively, we use itself as the previous metric 
    const previousMetric = index > 0 ? relevantHistory[index - 1] : currentMetric;

    const cpu = currentMetric.cpu || 0;
    const cost = currentMetric.cost || 0;
    const previousCost = previousMetric.cost || 0;

    const costChangeRate = cost - previousCost;
    const cpuToCostRatio = cost > 0 ? (cpu / cost) : 0;

    return [
      cpu,
      cost,
      costChangeRate,
      cpuToCostRatio
    ];
  });
};
