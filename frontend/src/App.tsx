import { useEffect, useRef, useState } from 'react'
import Charts from './components/Charts'
import AnomalyAlert from './components/AnomalyAlert'
import StopButton from './components/StopButton'
import Savings from './components/Savings'
import StatusBadge from './components/StatusBadge'
import { Anomaly, Metric } from './types'

function fetchMetrics(setMetrics: (m: Metric[]) => void) {
  fetch('/api/metrics').then((r) => r.json()).then(setMetrics).catch(console.error)
}

function fetchAnomalies(setAnomalies: (a: Anomaly[]) => void) {
  fetch('/api/anomalies').then((r) => r.json()).then(setAnomalies).catch(console.error)
}

function fetchSavings(setSavings: (s: number) => void) {
  fetch('/api/savings').then((r) => r.json()).then((d) => setSavings(d.savings)).catch(console.error)
}

export default function App() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [status, setStatus] = useState<'running' | 'stopped'>('running')
  const [stopping, setStopping] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [savings, setSavings] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearPoll() {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // Before stop: poll metrics + anomalies every 10s
  useEffect(() => {
    fetchMetrics(setMetrics)
    fetchAnomalies(setAnomalies)

    intervalRef.current = setInterval(() => {
      fetchMetrics(setMetrics)
      fetchAnomalies(setAnomalies)
    }, 10_000)

    return clearPoll
  }, [])

  function handleStop() {
    setStopping(true)
    setStopError(null)
    fetch('/api/action/stop', { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setStatus(data.resource.status)
        // Switch polling to savings only
        clearPoll()
        fetchSavings(setSavings)
        intervalRef.current = setInterval(() => fetchSavings(setSavings), 5_000)
      })
      .catch((err) => setStopError(String(err)))
      .finally(() => setStopping(false))
  }

  useEffect(() => clearPoll, [])

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Cloud Anomaly Dashboard</h1>
        <StatusBadge status={status} />
      </div>

      <div style={{ marginTop: 24 }}>
        {metrics.length > 0
          ? <Charts metrics={metrics} anomalies={anomalies} status={status} />
          : <p style={{ color: '#999' }}>Loading metrics...</p>
        }
      </div>

      <div style={{ marginTop: 24 }}>
        <AnomalyAlert anomalies={anomalies} />
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
        <StopButton status={status} hasAnomaly={anomalies.length > 0} stopping={stopping} onStop={handleStop} />
        {stopError && <span style={{ color: '#dc3545', fontSize: 14 }}>Error: {stopError}</span>}
        <Savings amount={savings} active={status === 'stopped'} />
      </div>
    </div>
  )
}
