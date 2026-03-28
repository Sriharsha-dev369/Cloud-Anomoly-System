# Cloud Cost Optimizer – Production SaaS Mode (Agent Instructions)

## HARD RULES FOR BUILDING(STRICT)

Key Strategy

- Build layer by layer, not everything together
- Keep existing pipeline intact
- Add user layer on top, not rewrite

## PROJECT GOAL

Transform the system from a **demo / hardcoded setup** into a **real multi-user SaaS platform**.

Demonstrate:

User Auth → AWS Connect → Real Resources → Detection → Safe Action → Cost Savings → Logs → UI

System must work for **any user connecting their own AWS account**, not just predefined data.

---

## CORE FLOW (PRODUCTION MODE)

```text
User → Auth → AWS Connect → Fetch Resources → Normalize → Detect → Decide → Act → Cost Engine → Logs → UI
```

The system must clearly show:

1. User-specific environment (no shared/global state)
2. Secure AWS credential usage
3. Real EC2 resources fetched dynamically
4. Detection pipeline working unchanged
5. Safe execution of actions (per user)
6. Accurate cost + savings tracking

If all 6 work → Production system complete

---

## HARD RULES (STRICT)

- Do NOT break existing detection logic
- Do NOT break simulation mode
- Do NOT store or expose raw AWS credentials
- Do NOT mix user data across accounts
- Do NOT tightly couple AWS logic with core system
- Always normalize AWS data to internal format
- Always maintain fallback (simulation mode)

---

## CORE ARCHITECTURE

```text
Frontend (User Dashboard)
        ↓
Backend API (Auth + Business Logic)
        ↓
User Context Layer (per-user isolation)
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
Database (User-scoped)
```

---

## USER SYSTEM (CRITICAL)

### Authentication

Implement:

- Signup / Login
- JWT-based authentication
- Password hashing (bcrypt)

Each request must:

- Be authenticated
- Be tied to a specific user

---

### User Isolation

Rule:

- Every user has:
  - Their own AWS connection
  - Their own resources
  - Their own logs
  - Their own anomalies

No shared memory or global variables

---

## AWS INTEGRATION (USER-BASED)

### Credential Handling

Support:

- Access Key ID
- Secret Access Key

Rules:

- Store encrypted in DB
- Never send to frontend
- Validate before saving

---

### AWSAdapter Responsibilities

- Fetch EC2 instances
- Fetch CloudWatch metrics
- Execute stop/start actions
- Provide cost estimation

---

## RESOURCE MANAGEMENT

### Dynamic Fetching

Replace hardcoded resources with:

- Real EC2 instances per user

Each resource:

```ts
Resource = {
  instanceId,
  type,
  state,
  region,
  userId,
};
```

---

### Metrics (CloudWatch)

Normalize to:

```ts
Metric = {
  resourceId,
  timestamp,
  cpu,
  cost,
};
```

Rule:

Detection system must NOT know data source

---

## DETECTION SYSTEM

- Use existing logic unchanged
- Must work on normalized data
- Must run per user

---

## ACTION SYSTEM (REAL AWS)

Actions:

- Stop instance
- Start instance

Rules:

- Always scoped per user
- Require confirmation
- Apply cooldown (prevent spam)
- Sync DB after execution

---

## COST ENGINE

Rule:

Keep existing logic

```ts
cost = hourlyRate × usageDuration
```

Enhancements:

- Use real instance types
- Track per-user savings

---

## NORMALIZATION LAYER (MANDATORY)

All AWS data must be converted into:

- Resource
- Metric
- Action

Rule:

Core system must remain **cloud-agnostic**

---

## DATA STORAGE

Store per user:

- resources
- metrics
- anomalies
- actions
- savings
- logs
- aws credentials (encrypted)

Do NOT store raw AWS responses

---

## API CONTRACT

Extend existing APIs with auth:

- POST /auth/signup
- POST /auth/login
- POST /aws/connect

Existing (user-scoped):

- GET /resources
- GET /metrics
- GET /anomalies
- POST /action/stop
- GET /savings
- GET /logs

Rule:

All APIs must respect user isolation

---

## UI REQUIREMENTS

### Authentication UI

- Login / Signup pages

---

### AWS Connect UI

- Input credentials securely
- Show connection status

---

### Dashboard

Display:

- User’s EC2 instances
- CPU usage
- Cost/hour
- Anomalies
- Actions taken
- Savings

---

### Mode Indicator

Show:

- "Simulation Mode"
- "AWS Live Mode"

---

### Safety UX

- Confirmation before stopping instance
- Loading states
- Error handling (AWS failures)

---

## FALLBACK SYSTEM

If:

- No AWS connected OR
- AWS fails

Then:

→ Switch to simulation mode

```env
DATA_SOURCE = aws | simulation
```

---

## CODE QUALITY RULES

- Remove dead code
- Remove hardcoded values
- Use service-based structure:
  - authService
  - awsService
  - resourceService
  - anomalyService

- Use environment variables properly
- Keep functions small and testable

---

## EXPECTED PROJECT STRUCTURE

backend/

- server.ts
- routes/
- controllers/
- services/
- adapters/
  - MockAdapter.ts
  - AWSAdapter.ts

- middleware/
  - authMiddleware.ts

- models/
- utils/
- store/

frontend/

- pages/
  - Login.jsx
  - Signup.jsx
  - Dashboard.jsx
  - AWSConnect.jsx

- components/
  - ResourceCard.jsx
  - ModeToggle.jsx
  - AnomalyPanel.jsx

---

## SUCCESS CHECKLIST (MUST PASS)

- User can signup/login
- AWS account connects successfully
- EC2 instances fetched dynamically
- Metrics normalized correctly
- Detection works per user
- Actions (stop/start) work on real AWS
- Cost + savings tracked per user
- Logs reflect real events
- Simulation mode still works perfectly
- UI behaves like a real SaaS product

---

## PRIORITY ORDER

1. Auth system (JWT + user model)
2. AWS credential integration
3. Resource fetching (EC2)
4. User-scoped DB refactor
5. Metrics + normalization
6. Detection per user
7. Action system (real AWS)
8. Cost + savings tracking
9. UI integration
10. Cleanup + stabilization

---

## FINAL NOTE

This phase ensures:

> “System works for real users with real cloud accounts”

Next phase can focus on:

> “Automation + Intelligence (ML / AI decisions)”

Do NOT mix both.

First: **Make it usable**
Then: **Make it intelligent**

---
