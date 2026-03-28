import { Router } from 'express';
import { getSavings } from '../controllers/savingsController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.get('/', requireAuth, getSavings);
export default router;
