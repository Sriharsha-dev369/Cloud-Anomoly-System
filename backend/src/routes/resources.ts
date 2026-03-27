import { Router } from 'express';
import { getResources } from '../controllers/resourceController';

const router = Router();

router.get('/', getResources);

export default router;
