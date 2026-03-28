interface Props {
  activeMode: 'simulation' | 'aws';
  onChange: (mode: 'simulation' | 'aws') => void;
}

export default function ModeToggle({ activeMode, onChange }: Props) {
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
          onClick={() => onChange('aws')}
          style={{
            ...baseBtn,
            borderRadius: '0 20px 20px 0',
            ...(activeMode === 'aws' ? activeStyle : inactiveStyle),
          }}
        >
          AWS
        </button>
      </div>
    </div>
  );
}
