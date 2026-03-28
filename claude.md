# Cloud Cost Optimizer AWS Mode – Agent Instructions

## PROJECT GOAL

Enable **real AWS integration** while preserving the exact behavior of simulation mode.

Demonstrate:

Real Metrics → Detection → Safe Action → Real Savings → Logs → UI

System must behave **identically in both modes** (mock vs AWS)

---

## CORE FLOW (AWS MODE)

CloudWatch → Normalize → Detection Pipeline → Decision → Action → Cost Engine → Logs → UI

The system must clearly show:

1. Real AWS metrics ingestion
2. Normalized data (same format as mock)
3. Anomaly detection working unchanged
4. Safe execution of actions (stop/start)
5. Realistic cost estimation
6. Logs reflecting real events

If all 6 work → AWS mode complete

---

## HARD RULES (STRICT)

* Do NOT break simulation mode
* Do NOT tightly couple AWS logic with core system
* Do NOT expose raw AWS responses to UI
* Do NOT assume AWS data is always available
* Always normalize AWS data to internal format
* Always provide fallback (mock mode)

---

## CORE ARCHITECTURE

```text id="aws-arch-1"
Frontend (Dashboard)
        ↓
Backend API
        ↓
Cloud Adapter Layer
   ├── MockAdapter
   └── AWSAdapter
        ↓
Detection Pipeline
        ↓
Action Layer
        ↓
Cost Engine
        ↓
Data Layer (DB)
```

---

## CLOUD ADAPTER DESIGN (CRITICAL)

### Interface (COMMON)

```ts id="aws-iface-1"
getMetrics(resourceId): Metric[]
stopResource(resourceId): void
startResource(resourceId): void
getCost(resourceId): number
```

---

### MockAdapter

* Uses static / simulated data
* Already implemented
* Must remain unchanged

---

### AWSAdapter (NEW)

Responsibilities:

* Fetch CPU metrics from CloudWatch
* Control EC2 instances (stop/start)
* Provide cost estimation

Rule:

Return **same structure as MockAdapter**

---

## AWS INTEGRATION DETAILS

### 1. Metrics (CloudWatch)

Source:

* AWS CloudWatch

Data:

* CPUUtilization

Steps:

1. Fetch metrics
2. Convert to internal format:

```ts id="aws-metric-format"
Metric = {
  resourceId,
  timestamp,
  cpu,
  cost
}
```

---

### 2. Resource Control (EC2)

Actions:

* Stop instance
* Start instance

Rules:

* Always confirm before stopping
* Apply cooldown (prevent repeated actions)
* Update system DB after action

---

### 3. Cost Estimation

Options:

* Simple approximation (preferred)
* OR AWS pricing API (optional)

Rule:

Keep it simple:

```ts id="aws-cost"
cost = hourlyRate × usageDuration
```

---

## NORMALIZATION LAYER (MANDATORY)

AWS data must be transformed into:

* Metric
* Resource
* Action

Rule:

Core system should **never know data source**

---

## BUSINESS LOGIC RULES

### Detection

* Must work unchanged from V2
* Same detectors used

---

### Action

* Trigger via adapter
* Update DB
* Log event

---

### Cost Engine

* Use same logic as simulation
* No AWS-specific logic inside

---

### Logs

Must include:

* "AWS_METRIC_FETCHED"
* "AWS_ACTION_TRIGGERED"
* "AWS_ACTION_COMPLETED"

---

## SAFETY SYSTEM (CRITICAL)

### Mode Control

* Default → simulation
* AWS mode must be explicitly enabled

---

### Action Safety

Before stopping:

* Require confirmation
* Apply cooldown (e.g., 5–10 mins)

---

### Failure Handling

If AWS fails:

* Fallback to mock mode OR
* Show safe error state

---

## DATA STORAGE

Store:

* normalized metrics
* anomalies
* actions
* logs

Do NOT store raw AWS responses

---

## API CONTRACT (UNCHANGED)

Same APIs as V2:

* GET /resources
* GET /metrics
* GET /anomalies
* POST /action/stop
* GET /savings
* GET /logs

Rule:

API must behave same in both modes

---

## UI REQUIREMENTS

### Mode Indicator (NEW)

Show:

* "Simulation Mode"
* "AWS Live Mode"

---

### Behavior

UI must:

* Show identical structure in both modes
* Not expose AWS complexity
* Clearly reflect real-time actions

---

### Safety UX

* Confirmation dialog before stop
* Loading states for AWS calls
* Error messages if AWS fails

---

## EXPECTED PROJECT STRUCTURE

backend/

* server.js
* routes/
* adapters/

  * MockAdapter.js
  * AWSAdapter.js
* detectors/
* services/
* cost/
* modules/
* store/

frontend/

* App.jsx
* pages/
* components/

  * ModeToggle.jsx  ← NEW
  * Dashboard.jsx
  * ResourceDetail.jsx

---

## IMPLEMENTATION STYLE

* Keep AWS logic isolated
* Use adapter pattern strictly
* Avoid SDK leakage into business logic
* Keep functions small and testable
* Prefer clarity over completeness

---

## SUCCESS CHECKLIST (MUST PASS)

* AWS metrics fetched successfully
* Data normalized correctly
* Detection works on AWS data
* Stop/start actions work safely
* Cost calculated realistically
* Logs reflect AWS operations
* Simulation mode still works perfectly
* UI behaves identically in both modes

---

## PRIORITY ORDER

1. AWSAdapter (metrics fetch)
2. Normalization layer
3. Detection on AWS data
4. EC2 actions (stop/start)
5. Cost estimation
6. Logs integration
7. UI mode toggle + safety

---

## FINAL NOTE

This phase ensures:

> “System works with real cloud data”

Next phase adds:

> “System becomes intelligent”

Do not mix both.

Real integration first → intelligence later.
