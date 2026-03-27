import { Router } from 'express';
import healthRouter from './health';
import metricsRouter from './metrics';
import anomaliesRouter from './anomalies';
import actionRouter from './action';
import savingsRouter from './savings';
import resourcesRouter from './resources';

const router = Router();

router.use('/health', healthRouter);
router.use('/metrics', metricsRouter);
router.use('/anomalies', anomaliesRouter);
router.use('/action', actionRouter);
router.use('/savings', savingsRouter);
router.use('/resources', resourcesRouter);

export default router;
