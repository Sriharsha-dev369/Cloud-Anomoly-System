import { Router } from 'express';
import { getResources } from '../controllers/resourceController';
import { getLiveResources } from '../controllers/liveResourceController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.get('/', requireAuth, getResources);
router.get('/live', requireAuth, getLiveResources);
export default router;
