# Phase 10 — Cleanup + Stability Tasks

## Task 1 — Env Variables + Clean Constants
- [x] Add PORT, JWT_SECRET, ENCRYPTION_KEY to backend/.env
- [x] Verify .gitignore includes .env
- [x] server.ts — PORT from env
- [x] db/connection.ts — warn if MONGO_URI not set
- [x] authService.ts — warn if JWT_SECRET not set
- [x] encryption.ts — warn if ENCRYPTION_KEY not set

## Task 2 — Error Handling
- [x] New: backend/src/middleware/errorHandler.ts
- [x] app.ts — register global error handler
- [x] server.ts — unhandledRejection + uncaughtException guards

## Task 3 — Dead Code Removal
- [x] Remove getLogs() from inMemoryStore.ts (unused)
- [x] Remove ChartPlaceholder.tsx (unused)
- [x] Fix Anomaly type — add confidence field to models/types.ts
