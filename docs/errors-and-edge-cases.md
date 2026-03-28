---
title: Errors and Edge Cases
---

## API Errors

### POST /action/stop — resource already stopped (409)

If the resource is already in `status: 'stopped'`, the controller returns HTTP 409:

```json
{ "error": "Resource is already stopped" }
```

This prevents double-stop from concurrent UI clicks or stale state.

### getResource / store functions — resource not found

If `findOneResource` returns `null`, `inMemoryStore.getResource` throws:

```
Error: Resource <id> not found
```

This propagates as an unhandled 500 from Express. In practice this cannot happen with the seeded dataset unless a caller passes an invalid `resourceId`. The frontend only uses resource IDs obtained from `GET /resources`, so this path is unreachable in normal use.

---

## Anomaly Detection Edge Cases

### Not enough data points

`detectAnomalies` requires exactly 10 consecutive minutes of data (`last10.length < WINDOW`). For a freshly restarted resource still in the 15-minute recovery window, metrics show normal CPU so the window fills but detection returns `[]`. If a resource is stopped partway through the window, the last N data points will have `cpu ≈ 0–2%`, which can satisfy the `allLow` check — but `costIncreasing` will be false (cost is frozen at stop time), so `low_usage` is not triggered.

### Cost flat check for low_usage

`low_usage` requires `cost[last] > cost[0]` across the 10-minute window. After a resource stops, cost is frozen to its value at stop time, so this check fails and `low_usage` is suppressed — correctly, since the resource is no longer running up cost.

### Anomaly dedup vs auto-stop dedup

Two independent runtime `Set`s prevent double-firing:

| Set               | Gates                    | Cleared by       |
|-------------------|--------------------------|------------------|
| `loggedAnomalies` | anomaly log message      | `restartResource` |
| `autoStopped`     | auto-stop action         | `restartResource` |

They are independent so that enabling autoMode after an anomaly has been logged still triggers the stop (the `autoStopped` flag is still clear even if `loggedAnomalies` is set).

### AutoMode enabled after anomaly is already detected

Scenario: anomaly fires at T+0, user enables autoMode at T+5.

- `loggedAnomalies` is already set → no duplicate log
- `autoStopped` is still clear → auto-stop fires on next `/anomalies` poll

This is correct behaviour. The two-Set design specifically enables this.

---

## Recovery Window

After a restart, metrics show normal CPU for **15 minutes** (`RECOVERY_MINUTES = 15`). This prevents an immediate re-detection loop:

```
auto-stop → restart → anomaly re-detected immediately → auto-stop again → ...
```

During recovery:
- `metricsService` ignores the resource's drop/spike pattern
- All 60 data points show normal CPU range
- `detectAnomalies` returns `[]`

After 15 minutes, the pattern resumes. For `res-001` (drops after 40 minutes), this means the resource will run normally for at least 15 minutes post-restart before the drop pattern appears in the window again.

---

## Auto-Stop Loop (historical bug, now fixed)

**Root cause**: Originally, `loggedAnomalies.delete` was called in `stopResource`. After auto-stop, the dedup flag was immediately cleared. After restart + 1-minute recovery, the anomaly was re-detected and auto-stop fired again — creating an infinite loop.

**Fix**:
1. `loggedAnomalies.delete` moved to `restartResource` only
2. `RECOVERY_MINUTES` increased from 1 to 15
3. Auto-stop gated by its own independent `autoStopped` Set

---

## Frontend Edge Cases

### UI stuck in monitoring mode after auto-stop

**Root cause**: Resources were only re-fetched when `anomalies.length > 0`. After ~10 minutes post-stop, cost becomes flat, so `costIncreasing = false` and the anomaly clears — returning `[]`. With no anomaly, resources were never re-fetched, so the UI never saw `status: 'stopped'`.

**Fix**: `fetchData` always re-fetches `/resources` on every poll cycle, regardless of anomaly state.

### Savings poll after stop

After the resource transitions to `stopped`, the 10-second poll is cleared via `clearPoll()` and a new 5-second savings interval starts. If `clearPoll` is called multiple times (e.g., resource status is `stopped` on two consecutive fetches before the interval clears), it is safe — `clearInterval` with an already-cleared ref is a no-op.

---

## Environment / Configuration Edge Cases

### dotenv: bare URL without key prefix

If `.env` contains a bare connection string without a `KEY=` prefix, dotenv silently ignores it:

```
# WRONG — dotenv ignores this line
mongodb+srv://user:pass@cluster.mongodb.net/db

# CORRECT
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```

Symptom: `process.env.MONGO_URI` is `undefined`; server falls back to `mongodb://localhost:27017`.

### Special characters in Atlas password

Characters like `@`, `$`, `#` in passwords must be URL-encoded in the connection string:

| Character | Encoded |
|-----------|---------|
| `@`       | `%40`   |
| `$`       | `%24`   |
| `#`       | `%23`   |
| `!`       | `%21`   |

Example: password `Ash@10$9` → `Ash%4010%249` in the URI.

### Mongoose `new: true` deprecation (Mongoose 9)

`findOneAndUpdate` option `{ new: true }` is deprecated in Mongoose 9. The system uses `{ returnDocument: 'after' }` instead in all repository functions.

---

## Seed Idempotency

`db/seed.ts` checks `countDocuments()` before inserting. If the collections already have data, seed is skipped. This makes startup safe after:
- Server restart with existing Atlas data
- Hot-reload in development
- Redeployment without wiping the database
