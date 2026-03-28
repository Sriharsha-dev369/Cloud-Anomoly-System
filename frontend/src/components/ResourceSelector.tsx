import { Resource } from '../types';

interface Props {
  resources: Resource[];
  selectedId: string;
  onChange: (id: string) => void;
  label?: string;
}

export default function ResourceSelector({ resources, selectedId, onChange, label = 'Resource' }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <label style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>{label}:</label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ced4da', fontSize: 14, cursor: 'pointer' }}
      >
        {resources.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} (${r.costPerHour}/hr)
          </option>
        ))}
      </select>
    </div>
  );
}
