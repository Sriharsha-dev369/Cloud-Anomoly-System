import { Log } from '../types';

interface Props {
  logs: Log[];
}

const typeColor: Record<Log['type'], string> = {
  anomaly: '#dc3545',
  action: '#0d6efd',
};

export default function LogsTimeline({ logs }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 10 }}>Event Log</h3>
      {logs.length === 0 ? (
        <p style={{ color: '#999', fontSize: 13 }}>No events yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((log, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
              <span style={{ color: typeColor[log.type], fontWeight: 700, minWidth: 60, textTransform: 'uppercase' }}>
                {log.type}
              </span>
              <span style={{ color: '#888', whiteSpace: 'nowrap' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ color: '#333' }}>{log.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
