import { Router } from 'express';
import { getAutoModeHandler, setAutoModeHandler } from '../controllers/automodeController';

const router = Router();

router.get('/', getAutoModeHandler);
router.post('/', setAutoModeHandler);

export default router;
