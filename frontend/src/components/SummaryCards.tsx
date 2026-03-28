interface Props {
  runningCount: number;
  totalRunningCost: number;
  anomalyCount: number;
}

interface CardProps {
  label: string;
  value: string;
  accent: string;
}

function Card({ label, value, accent }: CardProps) {
  return (
    <div style={{
      flex: 1,
      minWidth: 160,
      padding: '16px 20px',
      borderRadius: 10,
      background: '#fff',
      border: '1px solid #dee2e6',
      borderLeft: `4px solid ${accent}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#212529' }}>
        {value}
      </div>
    </div>
  );
}

export default function SummaryCards({ runningCount, totalRunningCost, anomalyCount }: Props) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      <Card label="Running Resources" value={String(runningCount)} accent="#0d6efd" />
      <Card label="Accrued Cost" value={`$${totalRunningCost.toFixed(2)}`} accent="#fd7e14" />
      <Card label="Active Anomalies" value={String(anomalyCount)} accent={anomalyCount > 0 ? '#dc3545' : '#28a745'} />
    </div>
  );
}
