Cloud Cost Optimizer V2 – Agent Instructions (Post-MVP)
PROJECT GOAL

Evolve MVP into a realistic, product-like system while preserving simplicity.

Demonstrate:

Detection → (Auto/Manual) Action → Savings → History → Multi-resource clarity

This is still not full production, but should feel like a usable system, not a demo.

CORE FLOW (UPDATED)

Metric → Detection → Decision (Auto/Manual) → Action → Savings → Logs → UI

The system must clearly show:

Multiple resources generating metrics
Anomalies detected per resource
System can act automatically OR user triggers action
Actions affect resource state
Savings accumulate over time
Events are recorded and visible

If all 6 work → V2 complete

HARD RULES (MUST FOLLOW)
Do NOT introduce microservices
Do NOT use complex cloud infra
Do NOT add ML models
Do NOT overengineer architecture
Keep logic understandable in one pass
Reuse MVP logic wherever possible
Keep system debuggable and demo-friendly
SCOPE UPGRADES (FROM MVP)
Added Capabilities
Multiple resources
Auto mode (automatic actions)
Persistent storage (basic DB)
Event logs / timeline
Improved anomaly detection (multiple rules)
Basic authentication (simple, minimal)

DATA MODELS (UPDATED)
Resource
id
name
status ("running" | "stopped")
costPerHour
Metric
resourceId
timestamp
cpu
cost
Anomaly
resourceId
type ("low_usage" | "spike_usage")
detectedAt
Action
resourceId
type ("stop")
status ("pending" | "completed")
triggeredBy ("user" | "system")
Log
timestamp
resourceId
type ("anomaly" | "action")
message
User (NEW – BASIC ONLY)
id
username
password (plain or hashed – keep simple)

API CONTRACT (EXTENDED)
GET /metrics

Return metrics for all or selected resource

GET /anomalies

Return anomalies (filter by resource optional)

POST /action/stop
Stop a resource
Works for manual + auto mode
GET /savings

Return total accumulated savings

GET /logs

Return timeline of events (anomalies + actions)

POST /auth/login

Basic login (no complex auth system)

GET /resources

Return all resources

BUSINESS LOGIC RULES
Anomaly Detection (UPGRADED)
Low usage:
CPU < 20% for a duration
Spike usage:
Cost spike > 2× average
Auto Mode

If enabled:

System automatically triggers stop on anomaly
Log must indicate "system triggered"

If disabled:

User manually triggers action
Savings
savings = costPerHour × hoursStopped
Accumulate over time (not reset per action)
Logs (MANDATORY)

Every important event must be logged:

anomaly detected
action triggered
action completed
STORAGE
Replace in-memory store with simple DB
(MongoDB / SQLite / JSON file acceptable)
No complex schema design
Keep queries simple
EXPECTED PROJECT STRUCTURE

backend/

server.js
routes/
services/
store/ (DB logic)
modules/ (resource, anomaly, action, logs)

frontend/

App.jsx
components/
ResourceSelector.jsx
Charts.jsx
AnomalyPanel.jsx
ActionControl.jsx
LogsTimeline.jsx
Savings.jsx

IMPLEMENTATION STYLE
Keep functions modular and reusable
Avoid deep abstraction layers
Prefer simple services over complex patterns
Keep logic readable in <30 seconds per file
Prioritize clarity over scalability
UI REQUIREMENTS (UPDATED DASHBOARD)

Single dashboard with:

Resource selector (switch between resources)
CPU + cost charts per resource
Anomaly display per resource
Auto mode toggle (ON/OFF)
Stop action button
Logs / timeline panel
Total savings display
SUCCESS CHECKLIST (MUST PASS)
Multiple resources visible and switchable
Anomalies detected per resource
Auto mode works correctly
Manual action still works
Logs show full history
Savings accumulate correctly
Data persists after refresh
System feels like a real tool
AGENT BEHAVIOR INSTRUCTIONS
Extend MVP, do NOT rewrite it
Reuse existing logic wherever possible
Add features incrementally
Do not break existing flow
Keep system demo-friendly
Avoid unnecessary dependencies
PRIORITY ORDER
Multi-resource support
Persistent storage
Improved anomaly detection
Auto mode
Logs system
UI upgrades
Basic authentication
FINAL NOTE

This is V2 (Post-MVP).

Realistic > perfect
Clear flow > complex system
Feature depth > feature count

The system should feel like something a startup could demo — not just a prototype.
