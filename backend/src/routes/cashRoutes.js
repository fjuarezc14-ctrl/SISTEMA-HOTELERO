import { Router } from 'express';
import { cashController } from '../controllers/cashController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/transaction', cashController.createTransaction);
router.get('/transactions', cashController.getAll);

export default router;
