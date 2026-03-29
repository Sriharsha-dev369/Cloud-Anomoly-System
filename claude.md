Below is your **upgraded claude.md (ML Layer)** rewritten in the same strong, structured, production-style format as your AWS document.

---

# Cloud Cost Optimizer – ML Layer (Isolation Forest) Agent Instructions

## PROJECT GOAL

Enhance anomaly detection using **Isolation Forest (ML layer)** while preserving the existing **rule-based system as primary**.

Demonstrate:

Metrics → Rule Detection → ML Detection → Hybrid Decision → Confidence → Logs → UI

System must:

* Work fully without ML
* Improve detection when ML is available
* Never break existing pipeline

---

## CORE FLOW (HYBRID DETECTION)

```text id="ml-flow-1"
Metrics → Normalize → Rule Detection → Feature Builder → ML Model → Combine → Decision → Logs → UI
```

System must clearly show:

1. Rule-based anomaly detection (existing)
2. Feature extraction from metrics
3. ML anomaly scoring (Isolation Forest)
4. Hybrid decision (rules + ML)
5. Confidence-based output
6. Logs showing ML participation

If all 6 work → ML layer complete

---

## HARD RULES (STRICT)

* Do NOT remove or modify existing rule logic
* ML must be an optional enhancement
* If ML fails → system must fallback to rules instantly
* Do NOT block main pipeline for ML
* Do NOT expose ML complexity to frontend
* Keep ML lightweight (no heavy infra)

---

## CORE ARCHITECTURE

```text id="ml-arch-1"
Frontend (Dashboard)
        ↓
Backend API
        ↓
Detection Layer
   ├── Rule Engine (Primary)
   └── ML Engine (Isolation Forest)
        ↓
Hybrid Decision Engine
        ↓
Action Layer
        ↓
Cost Engine
        ↓
Data Layer (DB)
```

---

## ML ENGINE DESIGN (CRITICAL)

### Responsibilities

* Accept feature vectors
* Run Isolation Forest
* Return anomaly score + flag

---

### Interface

```ts id="ml-iface-1"
detectAnomaly(features): {
  anomalyScore: number,
  isAnomaly: boolean
}
```

---

### Rule

ML must return **simple, normalized output** usable by system.

---

## FEATURE ENGINEERING (MANDATORY)

### Input Source

Metrics from:

* CPU
* Network
* Disk
* Cost

---

### Feature Vector

```ts id="ml-features"
[
  cpuUtilization,
  networkIn,
  networkOut,
  diskReadOps,
  diskWriteOps,
  costPerHour,
  costChangeRate,
  cpuToCostRatio
]
```

---

### Derived Features (IMPORTANT)

```ts id="ml-derived"
costChangeRate = currentCost - previousCost
cpuToCostRatio = cpu / cost
```

---

### Rule

Feature structure must remain **consistent across all resources**

---

## ML MODEL (ISOLATION FOREST)

### Implementation Options

#### Option A (Preferred)

* Python + scikit-learn

#### Option B

* Node.js package (lighter, less accurate)

---

### Model Config

```python id="ml-config"
IsolationForest(
  n_estimators=100,
  contamination=0.05,
  random_state=42
)
```

---

### Training Strategy

* Unsupervised learning
* Train on recent historical data
* Minimum: 20–30 samples
* Retrain periodically

---

## HYBRID DECISION ENGINE (CRITICAL)

ML must NOT override rules blindly.

### Decision Logic

```ts id="ml-decision"
IF (ruleTriggered)
   → anomaly = true

ELSE IF (mlTriggered AND anomalyScore < threshold)
   → anomaly = true

ELSE
   → anomaly = false
```

---

### Confidence Calculation

```ts id="ml-confidence"
IF ruleTriggered → HIGH
ELSE IF mlTriggered → MEDIUM
ELSE → LOW
```

---

## DATA STORAGE (EXTENSION)

Extend anomaly schema:

```ts id="ml-schema"
{
  resourceId,
  timestamp,
  ruleTriggered: boolean,
  mlTriggered: boolean,
  anomalyScore: number,
  confidence: "LOW" | "MEDIUM" | "HIGH",
  reason: string
}
```

---

## PERFORMANCE RULES

* ML must run asynchronously
* Max ML response time: ~2 seconds

### Timeout Handling

```ts id="ml-timeout"
if ML timeout:
   skip ML → use rule result
```

---

## LOGGING (MANDATORY)

Logs must include:

* "ML_FEATURE_BUILT"
* "ML_ANOMALY_DETECTED"
* "ML_SKIPPED_FALLBACK"
* "HYBRID_DECISION_MADE"

---

## FAILURE HANDLING

If ML fails:

* Ignore ML result
* Continue with rule-based detection
* Log failure event

System must remain fully functional

---

## API CONTRACT (EXTENDED, NOT BROKEN)

Existing APIs remain unchanged.

### Add optional ML fields:

```json id="ml-api"
{
  "ruleTriggered": true,
  "mlTriggered": false,
  "confidence": "HIGH",
  "anomalyScore": -0.21
}
```

---

## UI REQUIREMENTS

### Anomaly Source Indicator (NEW)

Show:

* Rule-based
* ML-based
* Hybrid

---

### Confidence Display

* HIGH → strong anomaly
* MEDIUM → ML detected
* LOW → normal

---

### Behavior

* UI must remain simple
* Do NOT expose ML internals
* Show meaningful explanation only

---

## CODE STRUCTURE (EXPECTED)

backend/

* services/

  * mlService.ts
  * featureService.ts
  * anomalyService.ts (updated)

* modules/

  * isolationForest/

* detectors/ (unchanged)

---

## IMPLEMENTATION STYLE

* Keep ML isolated from core logic
* No tight coupling with detection pipeline
* Small, testable functions
* Prefer clarity over ML complexity

---

## SUCCESS CHECKLIST (MUST PASS)

* Rule-based detection works unchanged
* ML detects additional anomalies
* False positives reduced
* ML failures do not break system
* Hybrid decision works correctly
* Logs reflect ML activity
* UI shows confidence + anomaly source

---

## PRIORITY ORDER

1. Feature builder
2. ML service (Isolation Forest)
3. Hybrid decision logic
4. DB schema update
5. Logging
6. API response update
7. UI indicators

---

## FINAL NOTE

This phase ensures:

> “System becomes intelligent without losing reliability”

Rules provide stability
ML provides adaptability

Do not replace rules — enhance them


