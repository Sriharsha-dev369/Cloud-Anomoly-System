import { Router } from 'express';
import { getLogsHandler } from '../controllers/logsController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.get('/', requireAuth, getLogsHandler);
export default router;
