import { Router } from 'express';
import { getLogsHandler } from '../controllers/logsController';

const router = Router();

router.get('/', getLogsHandler);

export default router;
