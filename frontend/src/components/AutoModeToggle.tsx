interface Props {
  autoMode: boolean;
  onChange: (enabled: boolean) => void;
}

export default function AutoModeToggle({ autoMode, onChange }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Auto Mode:</span>
      <button
        onClick={() => onChange(!autoMode)}
        style={{
          padding: '5px 14px',
          borderRadius: 20,
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          background: autoMode ? '#28a745' : '#6c757d',
          color: '#fff',
          transition: 'background 0.2s',
        }}
      >
        {autoMode ? 'ON' : 'OFF'}
      </button>
      {autoMode && (
        <span style={{ fontSize: 12, color: '#28a745' }}>System will stop anomalous resources automatically</span>
      )}
    </div>
  );
}
