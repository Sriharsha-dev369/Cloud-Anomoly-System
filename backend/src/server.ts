import app from './app';
import { connectDB } from './db/connection';
import { startSyncEngine } from './services/syncEngine';

const PORT = 4000;

connectDB().then(() => {
  startSyncEngine();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
