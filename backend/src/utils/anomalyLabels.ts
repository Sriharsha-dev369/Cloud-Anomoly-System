// Maps an anomaly type to a human-readable label for log messages.
export function getAnomalyReasonLabel(type: 'low_usage' | 'spike_usage'): string {
  return type === 'spike_usage' ? 'CPU spike detected' : 'low CPU usage';
}
