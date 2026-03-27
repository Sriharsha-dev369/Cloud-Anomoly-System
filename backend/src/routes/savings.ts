import { Router } from 'express';
import { getSavings } from '../controllers/savingsController';

const router = Router();

router.get('/', getSavings);

export default router;
