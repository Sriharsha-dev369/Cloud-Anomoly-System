---
title: Performance Characteristics
---

## Polling Intervals

| State                      | What is polled                          | Interval |
|----------------------------|-----------------------------------------|----------|
| Resource running           | /metrics, /logs, /anomalies, /resources | 10 s     |
| Resource stopped           | /savings                                | 5 s      |

After a resource stops, the 10-second poll is cleared and a new 5-second savings poll starts. Both intervals are managed via `useRef` in `App.tsx` to avoid stale closures.

## Requests per Poll Cycle

While running, one poll cycle fires **4 parallel fetches**:

1. `GET /metrics` — generates 60 data points in memory
2. `GET /logs` — Atlas query, sorted by timestamp desc
3. `GET /anomalies` — generates metrics + runs detection + potential Atlas writes
4. `GET /resources` — Atlas query, sorted by resourceId

No request batching or caching. Each fetch is independent.

## Metrics Generation Cost

`generateMetrics` runs a loop of 60 iterations per call. No I/O — the only DB call is `getResource` (single Atlas document read). CPU and cost values use `Math.random()` seeded fresh each call; there is no caching or memoization.

Each `/anomalies` call also calls `generateMetrics` internally, so metrics are generated twice per poll cycle (once for `/metrics`, once for `/anomalies`). This is acceptable for the demo scale.

## Atlas Query Patterns

| Operation                 | Collection  | Query                      | Index used        |
|---------------------------|-------------|----------------------------|-------------------|
| List all resources        | resources   | `find().sort({ resourceId: 1 })` | default _id |
| Get one resource by id    | resources   | `findOne({ resourceId })`  | `resourceId` unique |
| Stop / restart resource   | resources   | `findOneAndUpdate({ resourceId })` | `resourceId` unique |
| Count resources (seed)    | resources   | `countDocuments()`         | collection scan   |
| Create log                | logs        | `create(entry)`            | —                 |
| List logs by resource     | logs        | `find({ resourceId }).sort({ timestamp: -1 })` | `resourceId` |
| Count logs (seed)         | logs        | `countDocuments()`         | collection scan   |

`resourceId` is declared `unique: true` in the Mongoose schema, which creates a unique index automatically.

## Data Volume

Metrics and anomalies are never persisted. Only resources and logs grow over time.

- **resources**: fixed at 5 documents (seeded once, never added to)
- **logs**: grow with every anomaly detection and every stop/restart action. At a 10-second poll rate with one anomaly per resource per session, log growth is bounded per user session.

## Startup Sequence

```
connectDB()
  └── mongoose.connect(MONGO_URI)     ← single Atlas connection
  └── seed()
        ├── countResources() — if 0: insertMany(5 resources)
        └── countLogs()      — if 0: create(5 initial logs)
  └── app.listen(4000)
```

Server will not accept requests until Atlas is connected and seed completes. On failure, `process.exit(1)`.

## Known Bottlenecks (by design, acceptable for MVP)

- **Metrics regenerated on every request** — no caching. Acceptable because this is simulated data with no external I/O.
- **No connection pooling config** — Mongoose default pool (5 connections). Sufficient for single-user demo.
- **Logs query is unbounded** — `findLogs` returns all matching logs with no limit. For demo with bounded sessions this is fine; would need pagination in production.
- **No HTTP keep-alive / request compression** — plain JSON over HTTP/1.1.
