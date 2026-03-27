import { Anomaly } from '../types';

interface Props {
  anomalies: Anomaly[];
}

export default function AnomalyAlert({ anomalies }: Props) {
  if (anomalies.length === 0) {
    return (
      <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
        <strong>Anomaly Status</strong>
        <p style={{ margin: '8px 0 0', color: '#6c757d' }}>No anomalies detected.</p>
      </div>
    );
  }

  const a = anomalies[0];
  return (
    <div style={{ background: '#f8d7da', border: '1px solid #dc3545', borderRadius: 8, padding: 16 }}>
      <strong style={{ color: '#842029' }}>⚠ Anomaly Detected</strong>
      <p style={{ margin: '8px 0 0', color: '#842029' }}>
        Low usage detected — CPU has been below 5% for the last 10 minutes.
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6c757d' }}>
        Detected at: {new Date(a.detectedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
