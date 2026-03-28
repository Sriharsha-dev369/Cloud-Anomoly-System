Cloud Cost Optimizer V2.5 – Agent Instructions (Winning Foundation)
PROJECT GOAL

Transform system from MVP → structured, realistic, extensible product

Focus on:

Reliability + Modularity + Realistic flow

NOT intelligence yet (that comes after this phase)

CORE FLOW (REFINED)

Metrics → Detection Pipeline → Decision → Action → Cost Engine → Savings → Logs → UI

System must clearly show:

Data ingestion (mock or adapter)
Modular anomaly detection
Action execution
Cost impact calculation
Persistent tracking
Clear UI feedback

If all 6 work → foundation complete

HARD RULES (STRICT)
Do NOT introduce ML models
Do NOT overengineer infra
Do NOT add unnecessary features
Do NOT tightly couple modules
Do NOT break MVP logic
Always extend, never rewrite
CORE ARCHITECTURE (NEW)
Frontend (Dashboard + Views)
↓
Backend API Layer
↓
Detection Pipeline (modular)
↓
Decision + Action Layer
↓
Cost Engine
↓
Data Layer (DB)
↓
Cloud Adapter (mock / optional AWS)
KEY SYSTEM COMPONENTS

1. Cloud Adapter Layer

Purpose:

Abstract data source

Modes:

mock (default)
optional AWS CloudWatch (read-only)

Rule:

Same interface for both

getMetrics(resourceId): Metric[] 2. Detection Pipeline (IMPORTANT)

Move from single rule → modular detectors

Structure:

detectors = [
lowUsageDetector,
spikeDetector
]

Each detector:

detect(metrics) → anomaly | null

👉 Easy to extend later

3. Action Layer

Handles:

stop resource
future actions (resize etc.)

Rules:

Must be safe
Must update DB
Must log events 4. Cost Engine (NEW)

Separate logic:

calculateSavings(resource, duration)

Responsibilities:

Compute savings
Aggregate totals
Support future prediction

👉 DO NOT mix with business logic

5. Data Layer (PERSISTENT)

Use:

MongoDB / SQLite / simple DB

Store:

resources
metrics
anomalies
actions
logs

Rule:

Keep queries simple

DATA MODELS (UPDATED)
Resource
id
name
status
costPerHour
Metric
resourceId
timestamp
cpu
cost
Anomaly
id
resourceId
type ("low_usage" | "spike_usage")
detectedAt
Action
id
resourceId
type ("stop")
status
triggeredBy
Log
id
timestamp
resourceId
type
message
API CONTRACT (UPDATED)
GET /resources

Return all resources

GET /metrics?resourceId=

Return metrics per resource

GET /anomalies?resourceId=

Return anomalies

POST /action/stop

Trigger stop action

GET /savings

Return aggregated savings

GET /logs

Return system logs

BUSINESS LOGIC RULES
Detection
Low usage:
CPU < 20% for duration
Spike:
Cost > 2× average
Action
Stop resource
Update status
Log event
Cost Engine
savings = costPerHour × stoppedDuration
Must accumulate globally
Logging (MANDATORY)

Log:

anomaly detection
action trigger
action completion
UI REQUIREMENTS
Dashboard
Multi-resource list
CPU + cost charts
Anomaly indicators
Savings summary
Detail View (NEW)

Per resource:

metrics
anomalies
actions
logs
UX Signals
loading states
empty states
error handling
EXPECTED PROJECT STRUCTURE

backend/

server.js
routes/
adapters/ ← NEW
detectors/ ← NEW
services/
cost/ ← NEW
modules/
store/

frontend/

App.jsx
pages/
Dashboard.jsx
ResourceDetail.jsx
components/
IMPLEMENTATION STYLE
Small, focused modules
Clear separation of concerns
Avoid deep nesting
Prefer simple functions
Keep files readable quickly
SUCCESS CHECKLIST (MUST PASS)
Multi-resource system works
Detection pipeline is modular
Data persists after restart
Cost engine calculates correctly
Logs are accurate and complete
UI reflects real system state
System feels structured and stable
PRIORITY ORDER
Multi-resource + DB
Detection pipeline
Cost engine separation
Adapter layer
UI (dashboard + detail view)
Stability (loading, errors)
WHAT COMES NEXT (Phase 3 – LIMITED)

After this:

Add ONLY:

Predictive savings
Recommendation system

DO NOT add more

FINAL NOTE

This phase builds:

“A system that looks real”

Next phase builds:

“A system that looks intelligent”

Don't mix both.
