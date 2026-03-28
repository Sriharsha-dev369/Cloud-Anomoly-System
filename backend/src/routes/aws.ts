import { Router } from 'express';
import { postConnect } from '../controllers/awsController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.post('/connect', requireAuth, postConnect);
export default router;
