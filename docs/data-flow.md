---
title: Data Flow
---

## Frontend Polling Loop

The frontend polls every **10 seconds** while a resource is running. After a resource stops, it switches to polling `/savings` every **5 seconds**.

```
App.tsx (setInterval 10s)
  │
  ├── GET /metrics?resourceId=:id  → setMetrics → Charts
  ├── GET /logs?resourceId=:id     → setLogs → ActivityLog
  ├── GET /anomalies?resourceId=:id → setAnomalies → AnomalyAlert, Charts
  │     │
  │     │  [side effect on backend — see Anomaly Detection Flow]
  │
  └── GET /resources               → setResources → ResourceSelector, status checks
        │
        └── if resource.status === 'stopped':
              clearInterval (stop 10s poll)
              setInterval 5s → GET /savings → setSavings → SavingsCard
```

Resource fetch is always independent — it does not depend on anomalies being present. This ensures the UI reflects a stop triggered by auto-mode even when the anomaly clears (e.g., cost becomes flat after stop).

---

## Metrics Generation Flow

Metrics are computed fresh on every request — they are never stored.

```
GET /metrics?resourceId=res-001
  │
  └── metricsController → generateMetrics(resourceId)
        │
        ├── getResource(resourceId)        ← inMemoryStore → resourceRepository → Atlas
        ├── getRestartedAt(resourceId)     ← inMemoryStore (runtime map)
        │
        └── for i = 59 downto 0 (last 60 minutes):
              determine point state:
                isStopped?  → cpu ≈ 0–2%, cost frozen at stoppedAt value
                inRecovery? → normal CPU range (no drop/spike pattern applied)
                inSpike?    → cpu = 91–99%
                inDrop?     → cpu = 0–dropMax%
                normal      → cpu = normalMin–normalMax%
              cost = costPerHour * (minutesElapsed / 60)
```

**Recovery window**: 15 minutes after a restart (`RECOVERY_MINUTES = 15`). During this window, metrics show normal CPU regardless of the resource's pattern, preventing immediate re-detection of the same anomaly.

---

## Anomaly Detection Flow

```
GET /anomalies?resourceId=res-001
  │
  ├── generateMetrics(resourceId)    ← same as above
  ├── detectAnomalies(metrics)
  │     │
  │     ├── take last 10 data points
  │     ├── if < 10 points → return []   (not enough data)
  │     ├── if all cpu < 5% AND cost[last] > cost[first] → low_usage
  │     └── if all cpu > 90% → spike_usage
  │
  └── if anomalies.length > 0 AND resource.status === 'running':
        │
        ├── if !hasAnomalyBeenLogged(resourceId):
        │     addLog({ type: 'anomaly', message: '...' })  → logRepository → Atlas
        │     markAnomalyLogged(resourceId)                ← runtime Set
        │
        └── if autoMode AND !hasAutoStopped(resourceId):
              markAutoStopped(resourceId)                  ← runtime Set
              stopResource(resourceId)                     → resourceRepository → Atlas
              addLog({ type: 'action', message: '...' })   → logRepository → Atlas
```

Both dedup checks are independent. `loggedAnomalies` gates the log message; `autoStopped` gates the auto-stop action. This allows autoMode to be toggled on after an anomaly is first detected and still trigger the stop.

---

## Manual Stop Flow

```
POST /action/stop  { resourceId: "res-001" }
  │
  ├── getResource(resourceId)                     ← Atlas
  ├── if status === 'stopped' → 409
  ├── stopResource(resourceId)
  │     ├── updateResourceStopped(id, stoppedAt)  → Atlas
  │     └── restartedAt.delete(resourceId)        ← runtime Map
  ├── addLog({ type: 'action', message: '...' })  → Atlas
  └── respond: { resource, action: { triggeredBy: 'user' } }
```

---

## Restart Flow

```
POST /action/restart  { resourceId: "res-001" }
  │
  ├── restartResource(resourceId)
  │     ├── updateResourceRunning(id)              → Atlas ($unset stoppedAt)
  │     ├── loggedAnomalies.delete(resourceId)     ← runtime Set (reset anomaly dedup)
  │     ├── autoStopped.delete(resourceId)         ← runtime Set (reset auto-stop dedup)
  │     └── restartedAt.set(resourceId, now)       ← runtime Map (start recovery window)
  ├── addLog({ type: 'action', message: '...' })   → Atlas
  └── respond: { resource, action }
```

After restart, the frontend's resource fetch will see `status: 'running'`, clear the savings interval, and resume the 10-second monitoring poll.

---

## Savings Flow

```
GET /savings?resourceId=res-001  (polled every 5s after stop)
  │
  └── calculateSavings(resourceId)
        ├── getResource(resourceId)   ← Atlas
        ├── if not stopped → return 0
        └── savings = costPerHour * hoursSinceStop
```

---

## Write Path to Atlas

All writes go through the repository layer:

```
inMemoryStore.stopResource()
  └── resourceRepository.updateResourceStopped()
        └── ResourceModel.findOneAndUpdate(
              { resourceId },
              { $set: { status: 'stopped', stoppedAt } },
              { returnDocument: 'after' }
            )

inMemoryStore.addLog()
  └── logRepository.createLog()
        └── LogModel.create({ timestamp, resourceId, type, message })
```

Logs are append-only. No log entries are ever updated or deleted.
