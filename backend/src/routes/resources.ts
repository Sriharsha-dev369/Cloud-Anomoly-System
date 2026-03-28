import { Router } from 'express';
import { getResources } from '../controllers/resourceController';
import { getLiveResources } from '../controllers/liveResourceController';

const router = Router();

router.get('/', getResources);
router.get('/live', getLiveResources);

export default router;
