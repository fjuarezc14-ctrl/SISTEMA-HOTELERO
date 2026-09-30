import { Router } from 'express';
import { receiptController } from '../controllers/receiptController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/generate', requireModule('reception', 'store', 'cash'), receiptController.generate);

export default router;
