interface Props {
  status: 'running' | 'stopped';
  hasAnomaly: boolean;
  stopping: boolean;
  restarting: boolean;
  onStop: () => void;
  onRestart: () => void;
}

export default function StopButton({ status, hasAnomaly, stopping, restarting, onStop, onRestart }: Props) {
  if (status === 'stopped') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: '10px 20px', background: '#e2e3e5', border: '1px solid #adb5bd', borderRadius: 6, color: '#495057' }}>
          Instance Stopped
        </div>
        <button
          onClick={onRestart}
          disabled={restarting}
          style={{ padding: '10px 20px', background: restarting ? '#adb5bd' : '#28a745', color: '#fff', border: 'none', borderRadius: 6, cursor: restarting ? 'not-allowed' : 'pointer', fontSize: 14 }}
        >
          {restarting ? 'Restarting...' : 'Restart Instance'}
        </button>
      </div>
    );
  }

  // Running — stop is always available; style differs based on anomaly severity
  const isUrgent = hasAnomaly;
  return (
    <button
      onClick={onStop}
      disabled={stopping}
      title={isUrgent ? 'Stop anomalous instance' : 'Stop this instance manually'}
      style={{
        padding: '10px 24px',
        background: stopping ? '#adb5bd' : isUrgent ? '#dc3545' : '#6c757d',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: stopping ? 'not-allowed' : 'pointer',
        fontSize: 14,
      }}
    >
      {stopping ? 'Stopping...' : isUrgent ? 'Stop Instance' : 'Stop Instance'}
    </button>
  );
}
