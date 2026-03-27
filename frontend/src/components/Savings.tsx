interface Props {
  amount: number;
  active: boolean;
}

export default function Savings({ amount, active }: Props) {
  return (
    <div style={{
      background: active ? '#d4edda' : '#f8f9fa',
      border: `1px solid ${active ? '#28a745' : '#dee2e6'}`,
      borderRadius: 8,
      padding: '12px 24px',
      transition: 'background 0.3s',
    }}>
      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>Estimated Savings</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: active ? '#155724' : '#6c757d' }}>
        ₹{amount.toFixed(4)}
      </div>
    </div>
  );
}
