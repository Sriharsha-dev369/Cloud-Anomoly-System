import { Router } from 'express';
import { postStop, postRestart, postAction } from '../controllers/actionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, postAction);
router.post('/stop', requireAuth, postStop);
router.post('/restart', requireAuth, postRestart);

export default router;
