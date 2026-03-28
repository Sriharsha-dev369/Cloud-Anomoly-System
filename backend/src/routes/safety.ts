import { Router } from 'express';
import { getSafetyStatus, postLiveMode } from '../controllers/safetyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/live-mode', requireAuth, getSafetyStatus);
router.post('/live-mode', requireAuth, postLiveMode);

export default router;
