import { ImpactResource, ImpactSummary } from '../types';
import SummaryCards from './SummaryCards';
import StatusBadge from './StatusBadge';

interface Props {
  impact: ImpactSummary | null;
  anomalyMap: Record<string, number>;
  onSelect: (id: string) => void;
}

export default function DashboardView({ impact, anomalyMap, onSelect }: Props) {
  if (!impact) {
    return <p style={{ color: '#999', marginTop: 32 }}>Loading dashboard...</p>;
  }

  const runningCount = impact.perResource.filter((r) => r.status === 'running').length;
  const anomalyCount = Object.values(anomalyMap).reduce((s, n) => s + (n > 0 ? 1 : 0), 0);

  // Sort: running resources by runningCost desc (highest waste first), stopped by savings desc
  const sorted = [...impact.perResource].sort((a, b) => {
    const scoreA = a.status === 'running' ? a.runningCost : -1;
    const scoreB = b.status === 'running' ? b.runningCost : -1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.savings - a.savings;
  });

  // Top-N running resources by cost are flagged as "high spend"
  const runningByDescCost = sorted.filter((r) => r.status === 'running');
  const highSpendThreshold = runningByDescCost[1]?.runningCost ?? Infinity; // top 2 or more

  function isWasting(item: ImpactResource) {
    return item.status === 'running' && anomalyMap[item.id] > 0;
  }

  function isHighSpend(item: ImpactResource) {
    return item.status === 'running' && item.runningCost >= highSpendThreshold && item.runningCost > 0;
  }

  const colStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 14,
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  };

  const headerStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '2px solid #dee2e6',
    background: '#f8f9fa',
  };

  return (
    <div>
      <SummaryCards
        runningCount={runningCount}
        totalRunningCost={impact.totalRunningCost}
        anomalyCount={anomalyCount}
      />

      <div style={{
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#212529' }}>Resources</span>
          <span style={{ fontSize: 12, color: '#adb5bd' }}>sorted by spend · click to inspect</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Name</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Type</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>$/hr</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Accrued</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Savings</th>
              <th style={{ ...headerStyle, textAlign: 'center' }}>Anomaly</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const wasting = isWasting(item);
              const highSpend = isHighSpend(item);
              const rowBg = wasting ? '#fff8f8' : highSpend ? '#fffbf0' : item.status === 'stopped' ? '#fafafa' : '#fff';
              const rowBorder = wasting ? '3px solid #dc3545' : highSpend ? '3px solid #fd7e14' : '3px solid transparent';

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  style={{
                    cursor: 'pointer',
                    background: rowBg,
                    borderLeft: rowBorder,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                >
                  <td style={{ ...colStyle, fontWeight: 600, color: '#212529' }}>
                    {item.name}
                  </td>
                  <td style={colStyle}>
                    <StatusBadge status={item.status as 'running' | 'stopped'} />
                  </td>
                  <td style={{ ...colStyle, color: '#6c757d', fontFamily: 'monospace', fontSize: 13 }}>
                    {item.instanceType}
                  </td>
                  <td style={{ ...colStyle, textAlign: 'right', color: '#495057' }}>
                    ${item.costPerHour.toFixed(2)}
                  </td>
                  <td style={{ ...colStyle, textAlign: 'right', fontWeight: item.runningCost > 0 ? 600 : 400, color: item.runningCost > 0 ? '#fd7e14' : '#adb5bd' }}>
                    {item.runningCost > 0 ? `$${item.runningCost.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...colStyle, textAlign: 'right', fontWeight: item.savings > 0 ? 600 : 400, color: item.savings > 0 ? '#28a745' : '#adb5bd' }}>
                    {item.savings > 0 ? `$${item.savings.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...colStyle, textAlign: 'center' }}>
                    {anomalyMap[item.id] > 0 ? (
                      <span style={{ background: '#dc3545', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        ⚠ {anomalyMap[item.id]}
                      </span>
                    ) : item.status === 'running' ? (
                      <span style={{ color: '#28a745', fontSize: 13 }}>✓</span>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <p style={{ textAlign: 'center', color: '#adb5bd', padding: 32 }}>No resources found.</p>
        )}
      </div>
    </div>
  );
}
