import { useEffect, useRef, useState } from 'react'
import Charts from './components/Charts'
import AnomalyAlert from './components/AnomalyAlert'
import StopButton from './components/StopButton'
import Savings from './components/Savings'
import StatusBadge from './components/StatusBadge'
import ResourceSelector from './components/ResourceSelector'
import AutoModeToggle from './components/AutoModeToggle'
import ModeToggle from './components/ModeToggle'
import DashboardView from './components/DashboardView'
import LogsTimeline from './components/LogsTimeline'
import LoginForm from './components/LoginForm'
import AwsConnect from './components/AwsConnect'
import ConfirmDialog from './components/ConfirmDialog'
import { Anomaly, ImpactSummary, Log, Metric, Resource } from './types'

type View = 'dashboard' | 'detail' | 'aws-connect'

function qs(resourceId: string, source: 'mock' | 'aws') {
  return `?resourceId=${resourceId}&source=${source}`
}

function qsSince(base: string, since: string | null) {
  return since ? `${base}&since=${encodeURIComponent(since)}` : base
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  // Navigation
  const [view, setView] = useState<View>('dashboard')

  // Shared
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [activeMode, setActiveMode] = useState<'simulation' | 'aws'>('simulation')
  const [autoMode, setAutoMode] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [confirmingStop, setConfirmingStop] = useState(false)

  // Dashboard state
  const [impact, setImpact] = useState<ImpactSummary | null>(null)
  const [anomalyMap, setAnomalyMap] = useState<Record<string, number>>({})
  const dashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Detail view state
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [stopping, setStopping] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [savings, setSavings] = useState(0)
  const [logs, setLogs] = useState<Log[]>([])

  // Split polling intervals
  const metricsIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const logsIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const savingsIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Incremental fetch cursors
  const lastMetricTsRef = useRef<string | null>(null)
  const lastLogTsRef    = useRef<string | null>(null)

  // ── Auth helpers ──────────────────────────────────────────────────────
  function authHeader(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function handleUnauthorized(status: number) {
    if (status === 401) {
      localStorage.removeItem('token')
      setToken(null)
    }
  }

  // ── Poll clear helpers ────────────────────────────────────────────────
  function clearFastPoll() {
    if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current)
  }
  function clearLogsPoll() {
    if (logsIntervalRef.current) clearInterval(logsIntervalRef.current)
  }
  function clearSavingsPoll() {
    if (savingsIntervalRef.current) clearInterval(savingsIntervalRef.current)
  }
  function clearDashPoll() {
    if (dashIntervalRef.current) clearInterval(dashIntervalRef.current)
  }

  // ── Selected resource derivations ─────────────────────────────────────
  const selectedSource: 'mock' | 'aws' = activeMode === 'aws' ? 'aws' : 'mock'
  const selectedResource = resources.find((r) => r.id === selectedId)
  const status = selectedResource?.status ?? 'running'

  // ── Incremental metrics fetch ─────────────────────────────────────────
  function fetchMetricsIncremental(id: string, source: 'mock' | 'aws') {
    const since = lastMetricTsRef.current
    const url = qsSince(`/api/metrics${qs(id, source)}`, since)
    fetch(url, { headers: authHeader() })
      .then((r) => { handleUnauthorized(r.status); return r.json() })
      .then((data: Metric[]) => {
        if (data.length === 0) return
        lastMetricTsRef.current = data[data.length - 1].timestamp
        setMetrics((prev) => (since ? [...prev, ...data].slice(-60) : data))
      })
      .catch(console.error)
  }

  // ── Anomalies + resources (fast poll) ────────────────────────────────
  function fetchAnomaliesAndResources(id: string, source: 'mock' | 'aws') {
    fetch(`/api/anomalies${qs(id, source)}`, { headers: authHeader() })
      .then((r) => r.json()).then(setAnomalies).catch(console.error)
    fetch('/api/resources', { headers: authHeader() })
      .then((r) => r.json()).then((list: Resource[]) => {
        setResources(list)
        const resource = list.find((r) => r.id === id)
        if (resource?.status === 'stopped') {
          clearFastPoll()
          clearLogsPoll()
          fetchSavings(id, source)
          savingsIntervalRef.current = setInterval(() => fetchSavings(id, source), 5_000)
        }
      }).catch(console.error)
  }

  // ── Incremental logs fetch ────────────────────────────────────────────
  function fetchLogsIncremental(id: string, source: 'mock' | 'aws') {
    const since = lastLogTsRef.current
    const url = qsSince(`/api/logs${qs(id, source)}`, since)
    fetch(url, { headers: authHeader() })
      .then((r) => r.json())
      .then((data: Log[]) => {
        if (data.length === 0) return
        lastLogTsRef.current = data[0].timestamp
        setLogs((prev) => (since ? [...data, ...prev] : data))
      })
      .catch(console.error)
  }

  function fetchSavings(id: string, source: 'mock' | 'aws') {
    fetch(`/api/savings${qs(id, source)}`, { headers: authHeader() })
      .then((r) => r.json()).then((d) => setSavings(d.savings)).catch(console.error)
  }

  // ── Dashboard data ────────────────────────────────────────────────────
  function fetchDashboardData(list: Resource[], source: 'mock' | 'aws') {
    fetch('/api/impact', { headers: authHeader() })
      .then((r) => r.json()).then(setImpact).catch(console.error)
    if (list.length === 0) return
    Promise.all(
      list.map((r) =>
        fetch(`/api/anomalies${qs(r.id, source)}`, { headers: authHeader() })
          .then((res) => res.json())
          .then((a: Anomaly[]) => [r.id, a.length] as [string, number])
          .catch(() => [r.id, 0] as [string, number])
      )
    ).then((entries) => setAnomalyMap(Object.fromEntries(entries)))
  }

  // ── useEffect hooks — MUST stay before any conditional return ─────────

  // Initialization: re-runs whenever token changes (login / logout)
  useEffect(() => {
    if (!token) return
    fetch('/api/resources', { headers: authHeader() })
      .then((r) => { handleUnauthorized(r.status); return r.json() })
      .then((list: Resource[]) => {
        setResources(list)
        if (list.length > 0) setSelectedId(list[0].id)
      }).catch(console.error)
    fetch('/api/automode')
      .then((r) => r.json()).then((d: { autoMode: boolean }) => setAutoMode(d.autoMode)).catch(console.error)
    fetch('/api/safety/live-mode', { headers: authHeader() })
      .then((r) => r.json()).then((d: { liveMode: boolean }) => setLiveMode(d.liveMode)).catch(console.error)
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dashboard polling
  useEffect(() => {
    if (!token || view !== 'dashboard') return
    clearDashPoll()
    fetchDashboardData(resources, selectedSource)
    dashIntervalRef.current = setInterval(() => fetchDashboardData(resources, selectedSource), 15_000)
    return clearDashPoll
  }, [view, resources.length, activeMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detail polling
  useEffect(() => {
    if (!token || view !== 'detail' || !selectedId) return
    clearFastPoll(); clearLogsPoll(); clearSavingsPoll()
    setSavings(0); setMetrics([]); setAnomalies([])
    lastMetricTsRef.current = null
    lastLogTsRef.current = null

    fetchMetricsIncremental(selectedId, selectedSource)
    fetchAnomaliesAndResources(selectedId, selectedSource)
    fetchLogsIncremental(selectedId, selectedSource)

    metricsIntervalRef.current = setInterval(() => {
      fetchMetricsIncremental(selectedId, selectedSource)
      fetchAnomaliesAndResources(selectedId, selectedSource)
    }, 10_000)

    logsIntervalRef.current = setInterval(() =>
      fetchLogsIncremental(selectedId, selectedSource), 30_000)

    return () => { clearFastPoll(); clearLogsPoll(); clearSavingsPoll() }
  }, [view, selectedId, activeMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleSelectResource(id: string) {
    setSelectedId(id)
    setStopError(null)
    setView('detail')
  }

  function handleResourceChange(id: string) {
    setStopError(null)
    setSelectedId(id)
  }

  function handleModeChange(mode: 'simulation' | 'aws') {
    setActiveMode(mode)
    setStopError(null)
    if (resources.length > 0) setSelectedId(resources[0].id)
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

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  function handleStop() {
    if (!selectedId) return
    setConfirmingStop(true)
  }

  function handleConfirmStop() {
    setConfirmingStop(false)
    if (!selectedId) return
    setStopping(true)
    setStopError(null)
    fetch('/api/action/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ resourceId: selectedId, source: selectedSource }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error ?? `HTTP ${r.status}`) })
        return r.json()
      })
      .then((data: { resource: Resource }) => {
        setResources((prev) => prev.map((r) => r.id === data.resource.id ? data.resource : r))
        setAnomalies([])
        clearFastPoll(); clearLogsPoll()
        fetchLogsIncremental(selectedId, selectedSource)
        fetchSavings(selectedId, selectedSource)
        savingsIntervalRef.current = setInterval(() => fetchSavings(selectedId, selectedSource), 5_000)
      })
      .catch((err) => setStopError(String(err)))
      .finally(() => setStopping(false))
  }

  function handleCancelStop() {
    setConfirmingStop(false)
  }

  function handleLiveModeToggle() {
    const next = !liveMode
    fetch('/api/safety/live-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ enabled: next }),
    })
      .then((r) => r.json())
      .then((d: { liveMode: boolean }) => setLiveMode(d.liveMode))
      .catch(console.error)
  }

  function handleRestart() {
    if (!selectedId) return
    setRestarting(true)
    setStopError(null)
    fetch('/api/action/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ resourceId: selectedId, source: selectedSource }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error ?? `HTTP ${r.status}`) })
        return r.json()
      })
      .then((data: { resource: Resource }) => {
        setResources((prev) => prev.map((r) => r.id === data.resource.id ? data.resource : r))
        setSavings(0)
        setAnomalies([])
        clearFastPoll(); clearLogsPoll(); clearSavingsPoll()
        lastMetricTsRef.current = null
        lastLogTsRef.current = null

        fetchMetricsIncremental(selectedId, selectedSource)
        fetchAnomaliesAndResources(selectedId, selectedSource)
        fetchLogsIncremental(selectedId, selectedSource)

        metricsIntervalRef.current = setInterval(() => {
          fetchMetricsIncremental(selectedId, selectedSource)
          fetchAnomaliesAndResources(selectedId, selectedSource)
        }, 10_000)
        logsIntervalRef.current = setInterval(() =>
          fetchLogsIncremental(selectedId, selectedSource), 30_000)
      })
      .catch((err) => setStopError(String(err)))
      .finally(() => setRestarting(false))
  }

  // ── Rendering ──────────────────────────────────────────────────────────

  if (!token) {
    return <LoginForm onLogin={(t) => { setToken(t); localStorage.setItem('token', t) }} />
  }

  if (view === 'aws-connect') {
    return (
      <AwsConnect
        token={token}
        onConnect={() => {
          setView('dashboard')
          setResources([]) // force reload via initialization effect re-run won't happen, reload manually
          fetch('/api/resources', { headers: authHeader() })
            .then((r) => r.json())
            .then((list: Resource[]) => { setResources(list); if (list.length > 0) setSelectedId(list[0].id) })
            .catch(console.error)
        }}
        onSkip={() => setView('dashboard')}
      />
    )
  }

  // ── Header toolbar (shared by dashboard + detail) ─────────────────────
  const headerToolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <ModeToggle activeMode={activeMode} onChange={handleModeChange} />
      {activeMode === 'aws' && (
        <button
          onClick={handleLiveModeToggle}
          style={{
            padding: '6px 14px', borderRadius: 6, border: `1px solid ${liveMode ? '#dc3545' : '#adb5bd'}`,
            background: liveMode ? '#fff5f5' : '#f8f9fa', cursor: 'pointer', fontSize: 13,
            color: liveMode ? '#dc3545' : '#6c757d', fontWeight: 600,
          }}
        >
          {liveMode ? 'Live Mode: ON' : 'Live Mode: OFF'}
        </button>
      )}
    </div>
  )

  const connectAwsBtn = (
    <button
      onClick={() => setView('aws-connect')}
      style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #0d6efd', background: '#f0f7ff', color: '#0d6efd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
    >
      Connect AWS
    </button>
  )

  // ── Dashboard view ────────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <div style={{ fontFamily: 'sans-serif', maxWidth: 1080, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Cloud Anomaly Dashboard</h1>
          {connectAwsBtn}
          <button
            onClick={handleLogout}
            style={{ marginLeft: 'auto', padding: '5px 14px', background: 'none', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#6c757d' }}
          >
            Logout
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          {headerToolbar}
          <AutoModeToggle autoMode={autoMode} onChange={handleAutoModeChange} />
        </div>
        <DashboardView impact={impact} anomalyMap={anomalyMap} onSelect={handleSelectResource} />
      </div>
    )
  }

  // ── Detail view ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => setView('dashboard')}
          style={{ padding: '5px 12px', background: 'none', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#495057', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← Dashboard
        </button>
        <h1 style={{ margin: 0, fontSize: 22 }}>Cloud Anomaly Dashboard</h1>
        <StatusBadge status={status} />
        {connectAwsBtn}
        <button
          onClick={handleLogout}
          style={{ marginLeft: 'auto', padding: '5px 14px', background: 'none', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#6c757d' }}
        >
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {headerToolbar}
          <ResourceSelector resources={resources} selectedId={selectedId} onChange={handleResourceChange} />
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

      {confirmingStop && selectedResource && (
        <ConfirmDialog
          resource={selectedResource}
          liveMode={liveMode}
          isAws={activeMode === 'aws'}
          onConfirm={handleConfirmStop}
          onCancel={handleCancelStop}
        />
      )}
    </div>
  )
}
