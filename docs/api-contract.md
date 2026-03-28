---
title: API Contract
---

Base URL: `http://localhost:4000`
All responses are JSON. All requests that accept a body use `Content-Type: application/json`.

---

## GET /health

Returns server status.

**Response 200**
```json
{ "status": "ok" }
```

---

## GET /resources

Returns all cloud resources.

**Response 200**
```json
[
  {
    "id": "res-001",
    "name": "EC2 Instance A",
    "status": "running",
    "costPerHour": 0.50,
    "stoppedAt": null
  }
]
```

`stoppedAt` is an ISO 8601 string when stopped, absent or null when running.

---

## GET /metrics?resourceId=:id

Returns 60 simulated metric data points for the last 60 minutes.

**Query params**
- `resourceId` (optional) — if omitted, defaults to first resource

**Response 200**
```json
[
  {
    "resourceId": "res-001",
    "timestamp": "2026-03-28T10:00:00.000Z",
    "cpu": 74.3,
    "cost": 0.0021
  }
]
```

`cpu` is a percentage (0–100). `cost` is cumulative cost for the hour so far in USD.

---

## GET /anomalies?resourceId=:id

Detects anomalies for the resource. Also triggers anomaly logging and auto-stop side effects when applicable.

**Query params**
- `resourceId` (optional) — if omitted, defaults to first resource

**Response 200 — no anomaly**
```json
[]
```

**Response 200 — anomaly detected**
```json
[
  {
    "resourceId": "res-001",
    "type": "low_usage",
    "detectedAt": "2026-03-28T10:50:00.000Z"
  }
]
```

`type` values:
- `"low_usage"` — CPU < 5% for 10+ consecutive minutes while cost is still increasing
- `"spike_usage"` — CPU > 90% for 10+ consecutive minutes

Side effects (only when resource is `running`):
- Logs one anomaly message per run session (deduped by `loggedAnomalies` set)
- If autoMode is on, stops the resource once per run session (deduped by `autoStopped` set)

---

## POST /action/stop

Stops a resource manually.

**Request body**
```json
{ "resourceId": "res-001" }
```

**Response 200**
```json
{
  "resource": { "id": "res-001", "name": "EC2 Instance A", "status": "stopped", "costPerHour": 0.50, "stoppedAt": "2026-03-28T10:55:00.000Z" },
  "action": { "type": "stop", "status": "completed", "triggeredBy": "user" }
}
```

**Response 409** — resource already stopped
```json
{ "error": "Resource is already stopped" }
```

---

## POST /action/restart

Restarts a stopped resource. Clears anomaly and auto-stop dedup flags so a fresh session begins. Sets `restartedAt` to start the 15-minute recovery window.

**Request body**
```json
{ "resourceId": "res-001" }
```

**Response 200**
```json
{
  "resource": { "id": "res-001", "name": "EC2 Instance A", "status": "running", "costPerHour": 0.50 },
  "action": { "type": "restart", "status": "completed" }
}
```

---

## GET /savings?resourceId=:id

Returns cost saved since the resource was stopped.

**Query params**
- `resourceId` (optional) — if omitted, defaults to first resource

**Response 200**
```json
{ "savings": 0.0842 }
```

Returns `0` if the resource is not stopped.

---

## GET /automode

Returns current auto-mode state.

**Response 200**
```json
{ "autoMode": false }
```

---

## POST /automode

Sets auto-mode on or off.

**Request body**
```json
{ "enabled": true }
```

**Response 200**
```json
{ "autoMode": true }
```

---

## GET /logs?resourceId=:id

Returns audit log entries for a resource, newest first.

**Query params**
- `resourceId` (optional) — if omitted, returns all logs

**Response 200**
```json
[
  {
    "timestamp": "2026-03-28T10:55:00.000Z",
    "resourceId": "res-001",
    "type": "action",
    "message": "EC2 Instance A stopped manually by user"
  },
  {
    "timestamp": "2026-03-28T10:50:00.000Z",
    "resourceId": "res-001",
    "type": "anomaly",
    "message": "Anomaly detected on EC2 Instance A: low CPU usage"
  }
]
```

`type` values: `"anomaly"` | `"action"`

---

## Type Reference

```typescript
interface Resource {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  costPerHour: number;
  stoppedAt?: string;       // ISO 8601
}

interface Metric {
  resourceId: string;
  timestamp: string;        // ISO 8601
  cpu: number;              // 0–100
  cost: number;             // USD, 4 decimal places
}

interface Anomaly {
  resourceId: string;
  type: 'low_usage' | 'spike_usage';
  detectedAt: string;       // ISO 8601
}

interface Action {
  resourceId: string;
  type: 'stop';
  status: 'pending' | 'completed';
  triggeredBy: 'user' | 'system';
}

interface Log {
  timestamp: string;        // ISO 8601
  resourceId: string;
  type: 'anomaly' | 'action';
  message: string;
}
```
