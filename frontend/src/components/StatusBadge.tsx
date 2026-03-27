interface Props {
  status: 'running' | 'stopped';
}

export default function StatusBadge({ status }: Props) {
  const running = status === 'running';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 99,
      fontSize: 13,
      fontWeight: 600,
      background: running ? '#d4edda' : '#f8d7da',
      color: running ? '#155724' : '#721c24',
      border: `1px solid ${running ? '#c3e6cb' : '#f5c6cb'}`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: running ? '#28a745' : '#dc3545',
        display: 'inline-block',
      }} />
      {running ? 'Running' : 'Stopped'}
    </span>
  );
}
