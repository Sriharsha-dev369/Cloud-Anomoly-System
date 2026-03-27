import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Anomaly, Metric } from '../types';

interface Props {
  metrics: Metric[];
  anomalies: Anomaly[];
  stoppedAt?: string;
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function Chart({ title, data, children }: { title: string; data: object[]; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#333' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>{children}</LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Charts({ metrics, anomalies, stoppedAt }: Props) {
  const data = metrics.map((m) => ({
    time: formatTime(m.timestamp),
    cpu: m.cpu,
    cost: m.cost,
  }));

  const anomalyTime = anomalies.length > 0 ? formatTime(anomalies[0].detectedAt) : null;
  const anomalyColor = anomalies[0]?.reason === 'spike_usage' ? '#ffc107' : '#dc3545';
  const stoppedTime = stoppedAt ? formatTime(stoppedAt) : null;

  const sharedAxes = (unit?: string, domain?: [number, number], tickFormatter?: (v: number) => string) => (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={9} />
      <YAxis unit={unit} domain={domain} tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
    </>
  );

  const markers = (
    <>
      {anomalyTime && (
        <ReferenceLine
          x={anomalyTime}
          stroke={anomalyColor}
          strokeDasharray="4 2"
          label={{ value: 'Anomaly', fill: anomalyColor, fontSize: 11, position: 'insideTopRight' }}
        />
      )}
      {stoppedTime && (
        <ReferenceLine
          x={stoppedTime}
          stroke="#6c757d"
          strokeWidth={2}
          label={{ value: 'Stopped', fill: '#6c757d', fontSize: 11, position: 'insideTopLeft' }}
        />
      )}
    </>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Chart title="CPU Usage (%)" data={data}>
        {sharedAxes('%', [0, 100])}
        <Tooltip formatter={(v) => [`${v}%`, 'CPU']} />
        {markers}
        <Line type="monotone" dataKey="cpu" stroke="#4f86f7" dot={false} strokeWidth={2} />
      </Chart>

      <Chart title="Cost ($)" data={data}>
        {sharedAxes(undefined, undefined, (v: number) => `$${v.toFixed(2)}`)}
        <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, 'Cost']} />
        {markers}
        <Line type="monotone" dataKey="cost" stroke="#28a745" dot={false} strokeWidth={2} />
      </Chart>
    </div>
  );
}
