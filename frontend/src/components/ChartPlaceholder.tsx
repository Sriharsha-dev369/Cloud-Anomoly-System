interface Props {
  title: string;
}

export default function ChartPlaceholder({ title }: Props) {
  return (
    <div style={{ border: '1px dashed #ccc', borderRadius: 8, padding: 24, minHeight: 200 }}>
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      <p style={{ color: '#999', textAlign: 'center', marginTop: 60 }}>Chart area – data pending</p>
    </div>
  );
}
