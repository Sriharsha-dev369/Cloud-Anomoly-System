import { Router } from 'express';
import healthRouter from './health';
import metricsRouter from './metrics';
import anomaliesRouter from './anomalies';
import actionRouter from './action';
import savingsRouter from './savings';
import resourcesRouter from './resources';
import automodeRouter from './automode';
import logsRouter from './logs';
import authRouter from './auth';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/metrics', metricsRouter);
router.use('/anomalies', anomaliesRouter);
router.use('/action', actionRouter);
router.use('/savings', savingsRouter);
router.use('/resources', resourcesRouter);
router.use('/automode', automodeRouter);
router.use('/logs', logsRouter);

export default router;
