# Cloud Anomaly System

> Real-time cloud resource monitoring with hybrid ML anomaly detection, predictive cost savings, and automated remediation.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2%20%2B%20CloudWatch-FF9900?logo=amazonaws&logoColor=white)

---

## What It Does

Cloud Anomaly System watches your EC2 instances and spots problems before they drain your budget. It combines deterministic rule checks with a lightweight **Isolation Forest ML model** to detect both obvious and subtle anomalies — then tells you exactly what to do about them.

**Two modes, one dashboard:**
- **Simulation Mode** — runs against realistic mock data with seeded patterns (idle drops, usage spikes). No AWS account needed.
- **AWS Mode** — connects to your real account, pulls CloudWatch metrics, and can stop / start instances live.

---

## Features

### Hybrid Anomaly Detection
- **Rule engine** (primary) — deterministic checks for CPU drops below 5% and spikes above 90% across a 10-minute sliding window
- **Isolation Forest ML** (secondary) — trained on-the-fly against the last 60 minutes of metrics; fires when rules are inconclusive
- **Confidence scoring** — every alert carries a `HIGH`, `MEDIUM`, or `LOW` confidence level based on whether one or both engines agree

### Predictive Savings Engine
- Projects 24-hour cost delta based on linear trend extrapolation from live metrics
- Identifies idle resources before they accumulate cost
- Displayed inline on the resource detail view

### Smart Recommendations
- Rule-based advisory engine evaluates anomaly type, ML signal, and predicted savings
- Four rule categories: idle resource, usage spike, high predicted savings, stopped resource
- Priority ladder: `low → medium → high` escalated when ML confirms the signal

### Auto-Mode
- Toggle-able automatic stop when an anomaly is confirmed
- Two independent dedup sets prevent double-stop and duplicate log entries
- 15-minute recovery window after restart suppresses immediate re-detection

### AWS Integration
- Connects via per-user credential injection (no global IAM keys in code)
- Fetches real CloudWatch CPU metrics with gap interpolation for sparse data
- Live Mode toggle gates destructive EC2 stop/start actions behind an explicit confirmation

### Authentication
- JWT-based login, tokens stored in `localStorage`
- All API routes gated behind `Authorization: Bearer <token>`
- Passwords hashed with bcrypt

### Dashboard & Fleet View
- Fleet-level impact summary: total running cost + accumulated savings across all resources
- Per-resource anomaly counts for quick triage
- Drill into any resource for charts, anomaly alerts, logs timeline, and recommendations

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                  Frontend — React 18 / Vite                 │
│                       localhost:3000                        │
│                                                            │
│  Dashboard ──► DashboardView (fleet impact + anomaly map)  │
│  Detail    ──► Charts · AnomalyAlert · PredictiveInsights  │
│                LogsTimeline · Recommendations              │
│                                                            │
│  Polling: 10s (running) · 5s (savings after stop)          │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTP (proxied via Vite dev server)
                          ▼
┌────────────────────────────────────────────────────────────┐
│                Backend — Express / Node.js                  │
│                       localhost:4000                        │
│                                                            │
│  Routes → Controllers → Services → inMemoryStore           │
│                                         │                  │
│           ┌─────────────────────────────┤                  │
│           ▼                             ▼                  │
│    Repositories (Mongoose)       ML Engine                 │
│           │                 (Isolation Forest)             │
│           ▼                                                │
│    MongoDB Atlas                                           │
└────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
   AWS CloudWatch                    AWS EC2
  (GetMetricStatistics)   (Stop/Start/DescribeInstances)
```

### Backend Layers

| Layer | Responsibility |
|---|---|
| `routes/` | URL registration, no logic |
| `controllers/` | Parse req, call service/store, write res |
| `services/` | Pure computation — metrics, anomalies, savings, ML |
| `store/` | Runtime state + DB orchestration |
| `repositories/` | All Mongoose queries |
| `adapters/` | CloudAdapter interface: `mockAdapter` and `awsAdapter` |
| `detectors/` | Rule-based detectors: `spikeDetector`, `lowUsageDetector` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Charts | Recharts |
| Backend | Node.js 20, Express 4, TypeScript 5 |
| ML | Isolation Forest (`isolation-forest` v0.0.9) |
| Database | MongoDB Atlas, Mongoose 9 |
| Auth | JSON Web Tokens, bcrypt |
| AWS SDK | `@aws-sdk/client-ec2`, `@aws-sdk/client-cloudwatch` (v3) |
| Testing | Jest, Supertest, ts-jest |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (free tier works fine)
- (Optional) AWS account for live mode

### 1. Clone and install

```bash
git clone https://github.com/Sriharsha-dev369/Cloud-Anomoly-System.git
cd Cloud-Anomoly-System

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cloud-anomaly
JWT_SECRET=your-super-secret-key-here
PORT=4000
```

> **Special characters in Atlas password** — URL-encode them: `@` → `%40`, `$` → `%24`, `#` → `%23`

### 3. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default seed credentials are created on first start — register via the login form.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | `mongodb://localhost:27017` | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `PORT` | No | `4000` | Backend port |

---

## API Overview

Base URL: `http://localhost:4000/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/auth/signup` | Create account |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/resources` | List all resources |
| `GET` | `/metrics?resourceId=:id&source=mock\|aws` | 60-point metric history |
| `GET` | `/anomalies?resourceId=:id&source=mock\|aws` | Detect anomalies (also triggers auto-stop) |
| `GET` | `/savings?resourceId=:id` | Accumulated savings since stop |
| `GET` | `/impact` | Fleet-level cost + savings summary |
| `POST` | `/action/stop` | Stop a resource |
| `POST` | `/action/restart` | Restart a resource |
| `GET` | `/predictive-savings?resourceId=:id` | 24h cost projection |
| `GET` | `/recommendations?resourceId=:id` | Advisory recommendations |
| `GET` | `/logs?resourceId=:id` | Activity log timeline |
| `GET` | `/automode` | Get auto-mode state |
| `POST` | `/automode` | Toggle auto-mode |
| `GET` | `/aws/credentials` | Check AWS credentials status |
| `POST` | `/aws/credentials` | Save AWS credentials |
| `GET` | `/safety/live-mode` | Get live mode state |
| `POST` | `/safety/live-mode` | Toggle live mode |

Full request/response shapes: [`docs/api-contract.md`](docs/api-contract.md)

---

## Simulation Mode — Seeded Resource Patterns

| Resource | ID | Behaviour |
|---|---|---|
| EC2 Instance A | `res-001` | Normal 70–85% → drops to <2% at minute 40 |
| EC2 Instance B | `res-002` | Healthy 60–80% — no anomaly |
| EC2 Instance C | `res-003` | Normal 75–90% → drops to <2% at minute 30 |
| EC2 Instance D | `res-004` | Normal 65–78% → drops to <2% at minute 45 |
| EC2 Instance E | `res-005` | Normal 60–75% → spikes to 91–99% at minute 40 |

---

## Anomaly Detection Deep Dive

### Hybrid Decision Engine

```
Incoming metrics (60 data points)
        │
        ├──► Rule Engine (primary)
        │      ├── lowUsageDetector: last 10pts all cpu < 5% AND cost increasing
        │      └── spikeDetector:    last 10pts all cpu > 90%
        │
        └──► ML Engine (secondary, if metrics.length > 20)
               └── Isolation Forest
                     ├── Fit: all 60 historical feature vectors
                     ├── Score: latest data point
                     └── Anomaly if score ≥ 0.6

Rules fire → HIGH confidence
ML only   → MEDIUM confidence
Neither   → no anomaly
```

### Feature Vectors

Each data point is encoded as `[cpu, cost, deltaTime]` before feeding the Isolation Forest. The `featureService` normalizes and builds the rolling history window.

### ML Timeout Guard

The Isolation Forest runs inside a `Promise.race` with a 2-second hard timeout. If training or scoring exceeds the timeout, the system falls back to rule-only detection — the anomaly pipeline never blocks the API response.

---

## Project Structure

```
Cloud-Anomoly-System/
├── backend/
│   ├── src/
│   │   ├── adapters/          # CloudAdapter: mock + AWS implementations
│   │   ├── controllers/       # HTTP layer
│   │   ├── db/                # Mongoose models + seed + connection
│   │   ├── detectors/         # Rule detectors (spike, low usage)
│   │   ├── middleware/        # Auth + error handler
│   │   ├── models/            # Shared TypeScript types
│   │   ├── repositories/      # All DB queries
│   │   ├── routes/            # Express routers
│   │   ├── services/          # Business logic + ML engine
│   │   ├── store/             # Runtime state + inMemoryStore
│   │   └── utils/             # AWS client factory, encryption, retry
│   └── src/__tests__/         # Jest test suites
├── frontend/
│   └── src/
│       ├── components/        # React components
│       └── types/             # Shared frontend types
└── docs/                      # Architecture, API contract, data flow
```

---

## Running Tests

```bash
cd backend && npm test
```

Test suites cover: anomaly service, cost engine, savings service, and API endpoints (via Supertest).

---

## AWS Mode Setup

1. Click **Connect AWS** in the dashboard header
2. Enter your AWS Access Key ID and Secret Access Key
3. Credentials are encrypted at rest (AES-256 via `utils/encryption.ts`)
4. Toggle **Live Mode: ON** to allow real stop/start EC2 actions
5. Switch the top-level mode toggle to **AWS**

> CloudWatch metrics are fetched for the past 60 minutes with 1-minute granularity. Sparse datapoints (e.g., stopped instances) are filled via linear interpolation.

---

## Docs

| Document | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System design, layer responsibilities, DB schema |
| [`docs/api-contract.md`](docs/api-contract.md) | Full request/response shapes for all endpoints |
| [`docs/data-flow.md`](docs/data-flow.md) | Sequence diagrams for metrics, anomaly, stop, restart, savings |
| [`docs/performance.md`](docs/performance.md) | Polling intervals, Atlas query patterns, known bottlenecks |
| [`docs/errors-and-edge-cases.md`](docs/errors-and-edge-cases.md) | Edge case catalogue: dedup logic, recovery window, auto-stop loop fix |

---

## License

MIT
