import { Router } from 'express';
import { receiptController } from '../controllers/receiptController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/generate', receiptController.generate);

export default router;
