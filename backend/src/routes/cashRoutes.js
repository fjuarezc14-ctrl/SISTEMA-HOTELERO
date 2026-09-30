import { Router } from 'express';
import { cashController } from '../controllers/cashController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/transaction', requireModule('cash', 'incidents'), cashController.createTransaction);
router.get('/transactions', requireModule('cash'), cashController.getAll);
router.patch('/transactions/:id/cancel', requireModule('cash'), cashController.cancelTransaction);
router.patch('/transactions/:id/voucher', requireModule('cash'), cashController.updateVoucher);

export default router;
