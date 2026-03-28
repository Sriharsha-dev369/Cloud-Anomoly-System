import { Router } from 'express';
import { postStop, postRestart } from '../controllers/actionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/stop', requireAuth, postStop);
router.post('/restart', requireAuth, postRestart);

export default router;
