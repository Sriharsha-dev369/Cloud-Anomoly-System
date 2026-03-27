import { Router } from 'express';
import { postStop, postRestart } from '../controllers/actionController';

const router = Router();

router.post('/stop', postStop);
router.post('/restart', postRestart);

export default router;
