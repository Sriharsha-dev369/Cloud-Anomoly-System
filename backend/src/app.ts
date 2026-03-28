/// <reference path="./types/express.d.ts" />
import express from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);

// Global error handler — must be last middleware registered
app.use(errorHandler);

export default app;
