import { useEffect, useRef, useState } from 'react'
import Charts from './components/Charts'
import AnomalyAlert from './components/AnomalyAlert'
import StopButton from './components/StopButton'
import Savings from './components/Savings'
import StatusBadge from './components/StatusBadge'
import ResourceSelector from './components/ResourceSelector'
import AutoModeToggle from './components/AutoModeToggle'
import LogsTimeline from './components/LogsTimeline'
import LoginForm from './components/LoginForm'
import { Anomaly, Log, Metric, Resource } from './types'

function qs(resourceId: string, source: 'mock' | 'aws') {
  return `?resourceId=${resourceId}&source=${source}`;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [resources, setResources] = useState<Resource[]>([])
  const [liveResources, setLiveResources] = useState<Resource[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<'mock' | 'aws'>('mock')
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [stopping, setStopping] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [savings, setSavings] = useState(0)
  const [autoMode, setAutoMode] = useState(false)
  const [logs, setLogs] = useState<Log[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  if (!token) {
    return <LoginForm onLogin={setToken} />
  }

  const selectedResource = resources.find((r) => r.id === selectedId)
  const status = selectedResource?.status ?? 'running'

  function clearPoll() {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function fetchData(id: string, source: 'mock' | 'aws') {
    fetch(`/api/metrics${qs(id, source)}`).then((r) => r.json()).then(setMetrics).catch(console.error)
    fetchLogs(id, source)
    fetch(`/api/anomalies${qs(id, source)}`).then((r) => r.json()).then(setAnomalies).catch(console.error)
    const resourcesUrl = source === 'aws' ? '/api/resources/live' : '/api/resources'
    fetch(resourcesUrl).then((r) => r.json()).then((list: Resource[]) => {
      if (source === 'aws') setLiveResources(list); else setResources(list)
      const resource = list.find((r) => r.id === id)
      if (resource?.status === 'stopped') {
        clearPoll()
        fetchSavings(id, source)
        intervalRef.current = setInterval(() => fetchSavings(id, source), 5_000)
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

  function fetchSavings(id: string, source: 'mock' | 'aws') {
    fetch(`/api/savings${qs(id, source)}`).then((r) => r.json()).then((d) => setSavings(d.savings)).catch(console.error)
  }

  function fetchLogs(id: string, source: 'mock' | 'aws') {
    fetch(`/api/logs${qs(id, source)}`).then((r) => r.json()).then(setLogs).catch(console.error)
  }

  // Load resource lists + autoMode once
  useEffect(() => {
    fetch('/api/resources').then((r) => r.json()).then((list: Resource[]) => {
      setResources(list)
      if (list.length > 0) { setSelectedId(list[0].id); setSelectedSource('mock') }
    }).catch(console.error)
    fetch('/api/resources/live').then((r) => r.json()).then(setLiveResources).catch(console.error)
    fetch('/api/automode').then((r) => r.json()).then((d: { autoMode: boolean }) => setAutoMode(d.autoMode)).catch(console.error)
  }, [])

  // Re-fetch + re-poll when selected resource or source changes
  useEffect(() => {
    if (!selectedId) return
    clearPoll()
    setSavings(0)
    setMetrics([])
    setAnomalies([])
    fetchData(selectedId, selectedSource)

    intervalRef.current = setInterval(() => fetchData(selectedId, selectedSource), 10_000)
    return clearPoll
  }, [selectedId, selectedSource])

  function handleResourceChange(id: string, source: 'mock' | 'aws') {
    setStopError(null)
    setSelectedSource(source)
    setSelectedId(id)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  function handleStop() {
    if (!selectedId) return
    setStopping(true)
    setStopError(null)
    fetch('/api/action/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resourceId: selectedId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { resource: Resource }) => {
        setResources((prev) => prev.map((r) => r.id === data.resource.id ? data.resource : r))
        setAnomalies([])
        clearPoll()
        fetchLogs(selectedId, selectedSource)
        fetchSavings(selectedId, selectedSource)
        intervalRef.current = setInterval(() => fetchSavings(selectedId, selectedSource), 5_000)
      })
      .catch((err) => setStopError(String(err)))
      .finally(() => setStopping(false))
  }

  function handleRestart() {
    if (!selectedId) return
    setRestarting(true)
    setStopError(null)
    fetch('/api/action/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        fetchData(selectedId, selectedSource)
        intervalRef.current = setInterval(() => fetchData(selectedId, selectedSource), 10_000)
      })
      .catch((err) => setStopError(String(err)))
      .finally(() => setRestarting(false))
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Cloud Anomaly Dashboard</h1>
        <StatusBadge status={status} />
        <button
          onClick={handleLogout}
          style={{ marginLeft: 'auto', padding: '5px 14px', background: 'none', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#6c757d' }}
        >
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <ResourceSelector
            label="Mock"
            resources={resources}
            selectedId={selectedSource === 'mock' ? selectedId : ''}
            onChange={(id) => handleResourceChange(id, 'mock')}
          />
          {liveResources.length > 0 && (
            <ResourceSelector
              label="AWS Live"
              resources={liveResources}
              selectedId={selectedSource === 'aws' ? selectedId : ''}
              onChange={(id) => handleResourceChange(id, 'aws')}
            />
          )}
        </div>
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
        <StopButton status={status} hasAnomaly={anomalies.length > 0} stopping={stopping} restarting={restarting} onStop={handleStop} onRestart={handleRestart} />
        {stopError && <span style={{ color: '#dc3545', fontSize: 14 }}>Error: {stopError}</span>}
        <Savings amount={savings} active={status === 'stopped'} />
      </div>

      <div style={{ marginTop: 32, borderTop: '1px solid #dee2e6', paddingTop: 20 }}>
        <LogsTimeline logs={logs} />
      </div>
    </div>
  )
}
