import { useEffect, useRef, useState } from 'react'
import Charts from './components/Charts'
import AnomalyAlert from './components/AnomalyAlert'
import StopButton from './components/StopButton'
import Savings from './components/Savings'
import StatusBadge from './components/StatusBadge'
import ResourceSelector from './components/ResourceSelector'
import AutoModeToggle from './components/AutoModeToggle'
import LogsTimeline from './components/LogsTimeline'
import { Anomaly, Log, Metric, Resource } from './types'

function qs(resourceId: string) {
  return `?resourceId=${resourceId}`;
}

export default function App() {
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [stopping, setStopping] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [savings, setSavings] = useState(0)
  const [autoMode, setAutoMode] = useState(false)
  const [logs, setLogs] = useState<Log[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedResource = resources.find((r) => r.id === selectedId)
  const status = selectedResource?.status ?? 'running'

  function clearPoll() {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function fetchData(id: string) {
    fetch(`/api/metrics${qs(id)}`).then((r) => r.json()).then(setMetrics).catch(console.error)
    fetchLogs(id)
    fetch(`/api/anomalies${qs(id)}`).then((r) => r.json()).then((detected: Anomaly[]) => {
      setAnomalies(detected)
      // Sync resource status in case auto mode stopped it on the backend
      if (detected.length > 0) {
        fetch('/api/resources').then((r) => r.json()).then((list: Resource[]) => {
          setResources(list)
          const resource = list.find((r) => r.id === id)
          if (resource?.status === 'stopped') {
            clearPoll()
            fetchSavings(id)
            intervalRef.current = setInterval(() => fetchSavings(id), 5_000)
          }
        }).catch(console.error)
      }
    }).catch(console.error)
  }

  function handleAutoModeChange(enabled: boolean) {
    fetch('/api/automode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
      .then((r) => r.json())
      .then((d: { autoMode: boolean }) => setAutoMode(d.autoMode))
      .catch(console.error)
  }

  function fetchSavings(id: string) {
    fetch(`/api/savings${qs(id)}`).then((r) => r.json()).then((d) => setSavings(d.savings)).catch(console.error)
  }

  function fetchLogs(id: string) {
    fetch(`/api/logs${qs(id)}`).then((r) => r.json()).then(setLogs).catch(console.error)
  }

  // Load resource list + autoMode once
  useEffect(() => {
    fetch('/api/resources').then((r) => r.json()).then((list: Resource[]) => {
      setResources(list)
      if (list.length > 0) setSelectedId(list[0].id)
    }).catch(console.error)
    fetch('/api/automode').then((r) => r.json()).then((d: { autoMode: boolean }) => setAutoMode(d.autoMode)).catch(console.error)
  }, [])

  // Re-fetch + re-poll when selected resource changes
  useEffect(() => {
    if (!selectedId) return
    clearPoll()
    setSavings(0)
    setMetrics([])
    setAnomalies([])
    fetchData(selectedId)

    intervalRef.current = setInterval(() => fetchData(selectedId), 10_000)
    return clearPoll
  }, [selectedId])

  function handleResourceChange(id: string) {
    setStopError(null)
    setSelectedId(id)
  }

  function handleStop() {
    if (!selectedId) return
    setStopping(true)
    setStopError(null)
    fetch('/api/action/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: selectedId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { resource: Resource }) => {
        setResources((prev) => prev.map((r) => r.id === data.resource.id ? data.resource : r))
        clearPoll()
        fetchSavings(selectedId)
        intervalRef.current = setInterval(() => fetchSavings(selectedId), 5_000)
      })
      .catch((err) => setStopError(String(err)))
      .finally(() => setStopping(false))
  }

  function handleRestart() {
    if (!selectedId) return
    setStopError(null)
    fetch('/api/action/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: selectedId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { resource: Resource }) => {
        setResources((prev) => prev.map((r) => r.id === data.resource.id ? data.resource : r))
        setSavings(0)
        setAnomalies([])
        clearPoll()
        fetchData(selectedId)
        intervalRef.current = setInterval(() => fetchData(selectedId), 10_000)
      })
      .catch((err) => setStopError(String(err)))
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Cloud Anomaly Dashboard</h1>
        <StatusBadge status={status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <ResourceSelector resources={resources} selectedId={selectedId} onChange={handleResourceChange} />
        <AutoModeToggle autoMode={autoMode} onChange={handleAutoModeChange} />
      </div>

      <div style={{ marginTop: 24 }}>
        {metrics.length > 0
          ? <Charts metrics={metrics} anomalies={anomalies} stoppedAt={selectedResource?.stoppedAt} />
          : <p style={{ color: '#999' }}>Loading metrics...</p>
        }
      </div>

      <div style={{ marginTop: 24 }}>
        <AnomalyAlert anomalies={anomalies} />
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
        <StopButton status={status} hasAnomaly={anomalies.length > 0} stopping={stopping} onStop={handleStop} onRestart={handleRestart} />
        {stopError && <span style={{ color: '#dc3545', fontSize: 14 }}>Error: {stopError}</span>}
        <Savings amount={savings} active={status === 'stopped'} />
      </div>

      <div style={{ marginTop: 32, borderTop: '1px solid #dee2e6', paddingTop: 20 }}>
        <LogsTimeline logs={logs} />
      </div>
    </div>
  )
}
