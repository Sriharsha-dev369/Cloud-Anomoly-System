import { Router } from 'express';
import { getAnomalies } from '../controllers/anomalyController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.get('/', requireAuth, getAnomalies);
export default router;
