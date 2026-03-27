interface Props {
  status: 'running' | 'stopped';
  hasAnomaly: boolean;
  stopping: boolean;
  onStop: () => void;
  onRestart: () => void;
}

export default function StopButton({ status, hasAnomaly, stopping, onStop, onRestart }: Props) {
  if (status === 'stopped') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: '10px 20px', background: '#e2e3e5', border: '1px solid #adb5bd', borderRadius: 6, color: '#495057' }}>
          Instance Stopped
        </div>
        <button
          onClick={onRestart}
          style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >
          Restart Instance
        </button>
      </div>
    );
  }

  if (!hasAnomaly) return null;

  return (
    <button
      onClick={onStop}
      disabled={stopping}
      style={{ padding: '10px 24px', background: stopping ? '#adb5bd' : '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: stopping ? 'not-allowed' : 'pointer', fontSize: 16 }}
    >
      {stopping ? 'Stopping...' : 'Stop Instance'}
    </button>
  );
}
