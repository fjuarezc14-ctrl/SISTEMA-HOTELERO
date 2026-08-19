import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getProfile);

export default router;
