import { Router } from 'express';
import { postLogin } from '../controllers/authController';

const router = Router();
router.post('/login', postLogin);
export default router;
