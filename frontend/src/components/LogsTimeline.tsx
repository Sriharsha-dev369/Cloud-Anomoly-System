import { Log } from '../types';

interface Props {
  logs: Log[];
}

const today = new Date().toDateString();

function formatTime(ts: string): string {
  const d = new Date(ts);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return d.toDateString() === today ? timeStr : `${d.toLocaleDateString()} ${timeStr}`;
}

const TYPE_CONFIG = {
  anomaly: { label: '⚠ Anomaly', color: '#dc3545', bg: '#fff5f5', border: '#f5c6cb' },
  action:  { label: '✓ Action',  color: '#0d6efd', bg: '#f0f4ff', border: '#c7d7fd' },
} satisfies Record<Log['type'], { label: string; color: string; bg: string; border: string }>;

export default function LogsTimeline({ logs }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 12 }}>Event Log</h3>
      {logs.length === 0 ? (
        <p style={{ color: '#999', fontSize: 13 }}>No events yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map((log, i) => {
            const cfg = TYPE_CONFIG[log.type];
            return (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 13,
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <span style={{ color: cfg.color, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 80 }}>
                  {cfg.label}
                </span>
                <span style={{ color: '#888', whiteSpace: 'nowrap' }}>
                  {formatTime(log.timestamp)}
                </span>
                <span style={{ color: '#333' }}>{log.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
