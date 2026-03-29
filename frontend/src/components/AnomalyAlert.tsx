import { Anomaly } from '../types';

interface Props {
  anomalies: Anomaly[];
}

const config = {
  low_usage: {
    bg: '#f8d7da',
    border: '#dc3545',
    text: '#842029',
    label: 'Low Usage',
    description: 'CPU has been below 5% for 10+ minutes while cost is still increasing.',
  },
  spike_usage: {
    bg: '#fff3cd',
    border: '#ffc107',
    text: '#664d03',
    label: 'CPU Spike',
    description: 'CPU has been above 90% for 10+ consecutive minutes.',
  },
};

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
  const c = config[a.type];
  
  // 1. Determine Source (Rule / ML / Hybrid)
  // If undefined, default to Rule for backwards compatibility
  let sourceLabel = 'Rule';
  if (a.ruleTriggered && a.mlTriggered) {
    sourceLabel = 'Hybrid';
  } else if (a.mlTriggered && !a.ruleTriggered) {
    sourceLabel = 'ML';
  }
  
  // 2. Explanation enhancement
  let explanation = c.description;
  if (a.mlTriggered) {
    if (a.ruleTriggered) {
      // rule + ML
      explanation += ' (ML: Pattern deviates from normal behavior)';
    } else {
      // strictly ML
      explanation = 'Pattern deviates from normal behavior. ' + (a.reason || '');
    }
  }

  // Calculate confidence badge color
  let confColor = '#0dcaf0'; // LOW
  if (a.confidenceLevel === 'HIGH') confColor = '#dc3545';
  if (a.confidenceLevel === 'MEDIUM') confColor = '#fd7e14';

  let confLabel: string = a.confidenceLevel || 'LOW';
  if (!a.confidenceLevel && typeof a.confidence === 'number') {
    confLabel = `${Math.round(a.confidence * 100)}%`;
  }

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: c.text }}>⚠ Anomaly Detected</strong>
        <span style={{
          background: c.border,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 12,
          textTransform: 'uppercase',
        }}>
          {c.label}
        </span>

        {/* New Source Badge */}
        <span style={{
          background: '#6c757d',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          textTransform: 'uppercase',
        }}>
          Src: {sourceLabel}
        </span>

        {/* New Confidence Badge */}
        <span style={{
          background: confColor,
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          textTransform: 'uppercase',
        }}>
          Conf: {confLabel}
        </span>
      </div>
      <p style={{ margin: '8px 0 0', color: c.text }}>{explanation}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6c757d' }}>
        Detected at: {new Date(a.detectedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
