import { Router } from 'express';
import { postSignup, postLogin } from '../controllers/authController';

const router = Router();
router.post('/signup', postSignup);
router.post('/login', postLogin);
export default router;
