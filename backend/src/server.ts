import express from 'express';
import cors from 'cors';
import router from './routes';
import { connectDB } from './db/connection';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use('/', router);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
