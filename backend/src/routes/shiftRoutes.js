import { Router } from 'express';
import { shiftController } from '../controllers/shiftController.js';
import { authenticateToken, requireModule, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/active', shiftController.getActiveShift);
router.get('/active/transactions', requireAdmin, shiftController.getActiveTransactions);
router.post('/open', requireModule('cash'), shiftController.openShift);
router.post('/:id/close', requireModule('cash'), shiftController.closeShift);
router.get('/history', requireAdmin, shiftController.getHistory);
router.get('/:id/transactions', requireAdmin, shiftController.getShiftTransactions);

export default router;
