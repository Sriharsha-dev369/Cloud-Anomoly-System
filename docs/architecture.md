---
title: System Architecture
---

## Overview

Cloud Anomaly System is a full-stack monitoring dashboard. It simulates cloud resource metrics, detects anomalies, and can automatically stop resources to prevent cost overruns.

```
┌─────────────────────────────────────────┐
│            Frontend (React/Vite)         │
│               localhost:3000             │
│                                         │
│  App.tsx ──── polling every 10s ──────► │
│  Components: Charts, AnomalyAlert,      │
│              ResourceSelector, Logs     │
└────────────────────┬────────────────────┘
                     │ HTTP (proxied via Vite)
                     ▼
┌─────────────────────────────────────────┐
│          Backend (Express/Node)          │
│               localhost:4000             │
│                                         │
│  Routes → Controllers → Services        │
│                      ↕                  │
│         inMemoryStore (runtime state)   │
│                      ↕                  │
│         Repositories (DB queries)       │
└────────────────────┬────────────────────┘
                     │ Mongoose
                     ▼
┌─────────────────────────────────────────┐
│           MongoDB Atlas (cloud)          │
│  Collections: resources, logs           │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, TypeScript, Vite        |
| Charts     | Recharts                          |
| Backend    | Node.js, Express, TypeScript      |
| Database   | MongoDB Atlas (Mongoose ODM)      |
| Dev tools  | ts-node-dev, concurrently         |

## Backend Layer Separation

```
server.ts
  └── routes/index.ts          (route registration)
       └── routes/*.ts         (per-feature routers)
            └── controllers/   (HTTP in/out, no logic)
                 └── services/ (business logic, pure functions)
                 └── store/    (runtime state + DB orchestration)
                      └── repositories/ (all Mongoose queries)
                           └── db/      (Models + seed + connection)
```

### Layers in detail

**Controllers** — parse `req`, call store/service, write `res`. No business logic.

**Services** — pure computation: `metricsService` generates metric arrays; `anomalyService` detects anomalies from metrics; `savingsService` calculates cost saved.

**inMemoryStore** — single source of truth for runtime state (autoMode, dedup sets, restartedAt map). Calls repositories for persistence. Resets on server restart by design.

**Repositories** — all Mongoose queries in one place. No business logic.

**Models (db/)** — Mongoose schemas and TypeScript document interfaces.

## Runtime State (intentionally ephemeral)

| Field            | Type                  | Purpose                                      |
|------------------|-----------------------|----------------------------------------------|
| `autoMode`       | `boolean`             | Whether auto-stop is enabled                 |
| `loggedAnomalies`| `Set<resourceId>`     | Dedup: only log anomaly once per run session |
| `autoStopped`    | `Set<resourceId>`     | Dedup: only auto-stop once per run session   |
| `restartedAt`    | `Map<resourceId, ISO>`| Tracks restart time for recovery window      |

All four reset when the server process restarts. Resource and log data persists in Atlas.

## Database Collections

**resources** — stores resource configuration and live status.

```
{ resourceId, name, status, costPerHour, stoppedAt? }
```

**logs** — append-only audit trail of anomaly detections and stop/restart actions.

```
{ timestamp, resourceId, type, message }
```

## Seed Data

On server startup, `db/seed.ts` checks if collections are empty and inserts:
- 5 resources (`res-001` through `res-005`) with distinct CPU behaviour patterns
- 5 initial action logs (one per resource)

Seeding is idempotent — safe to run on every startup.

## Metrics Generation

Metrics are **generated on every request** — they are not stored. `metricsService` returns 60 data points (one per minute over the last hour) based on the resource's pattern and its current runtime state (stopped, in recovery, normal).

Each resource has a deterministic CPU behaviour pattern defined in `metricsService.ts`:

| Resource | Behaviour                                      |
|----------|------------------------------------------------|
| res-001  | Normal 70–85%, drops to <2% at minute 40      |
| res-002  | Healthy 60–80% all 60 minutes (no anomaly)    |
| res-003  | Normal 75–90%, drops to <2% at minute 30      |
| res-004  | Normal 65–78%, drops to <2% at minute 45      |
| res-005  | Normal 60–75%, spikes to 91–99% at minute 40  |
