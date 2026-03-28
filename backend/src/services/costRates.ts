// Approximate on-demand hourly rates (USD) for common EC2 instance types (us-east-1).
// Used by awsAdapter for per-metric cost and by awsDiscovery when upsetting resources.
export const HOURLY_RATE: Record<string, number> = {
  't3.nano':    0.0052,
  't3.micro':   0.0104,
  't3.small':   0.0208,
  't3.medium':  0.0416,
  't3.large':   0.0832,
  't3.xlarge':  0.1664,
  't3.2xlarge': 0.3328,
  'm5.large':   0.096,
  'm5.xlarge':  0.192,
  'm5.2xlarge': 0.384,
  'm5.4xlarge': 0.768,
  'r5.large':   0.126,
  'r5.xlarge':  0.252,
  'r5.2xlarge': 0.504,
  'c5.large':   0.085,
  'c5.xlarge':  0.17,
  'p3.xlarge':  3.06,
  'p3.2xlarge': 6.12,
};

// Returns the known on-demand rate for instanceType, or falls back to the stored rate.
export function getCostPerHour(instanceType?: string, fallback = 0.10): number {
  if (instanceType && HOURLY_RATE[instanceType] !== undefined) {
    return HOURLY_RATE[instanceType];
  }
  return fallback;
}
