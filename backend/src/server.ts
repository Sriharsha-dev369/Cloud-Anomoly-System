import app from './app';
import { connectDB } from './db/connection';
import { startSyncEngine } from './services/syncEngine';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ── Process-level error guards ─────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception — exiting:', err);
  process.exit(1);
});

connectDB().then(() => {
  startSyncEngine();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
