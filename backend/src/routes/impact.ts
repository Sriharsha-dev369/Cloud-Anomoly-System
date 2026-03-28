import { Router } from 'express';
import { getImpact } from '../controllers/impactController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getImpact);

export default router;
