import { Router } from 'express';
import { postStop } from '../controllers/actionController';

const router = Router();

router.post('/stop', postStop);

export default router;
