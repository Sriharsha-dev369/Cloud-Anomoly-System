interface Props {
  activeMode: 'simulation' | 'aws';
  serverMode: 'aws' | 'mock';
  onChange: (mode: 'simulation' | 'aws') => void;
}

export default function ModeToggle({ activeMode, serverMode, onChange }: Props) {
  const awsAvailable = serverMode === 'aws';

  const baseBtn: React.CSSProperties = {
    padding: '6px 18px',
    border: '1px solid #0d6efd',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'background 0.15s, color 0.15s',
  };

  const activeStyle: React.CSSProperties = { background: '#0d6efd', color: '#fff' };
  const inactiveStyle: React.CSSProperties = { background: '#fff', color: '#0d6efd' };
  const disabledStyle: React.CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Mode:</span>
      <div style={{ display: 'flex' }}>
        <button
          onClick={() => onChange('simulation')}
          style={{
            ...baseBtn,
            borderRadius: '20px 0 0 20px',
            borderRight: 'none',
            ...(activeMode === 'simulation' ? activeStyle : inactiveStyle),
          }}
        >
          Simulation
        </button>
        <button
          onClick={() => awsAvailable && onChange('aws')}
          disabled={!awsAvailable}
          title={awsAvailable ? undefined : 'Server not in AWS mode'}
          style={{
            ...baseBtn,
            borderRadius: '0 20px 20px 0',
            ...(activeMode === 'aws' ? activeStyle : inactiveStyle),
            ...(awsAvailable ? {} : disabledStyle),
          }}
        >
          AWS
        </button>
      </div>
      {!awsAvailable && (
        <span style={{ fontSize: 12, color: '#adb5bd' }}>
          Set <code>DATA_SOURCE=aws</code> to enable
        </span>
      )}
    </div>
  );
}
