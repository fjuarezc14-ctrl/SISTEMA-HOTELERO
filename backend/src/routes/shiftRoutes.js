import { Router } from 'express';
import { shiftController } from '../controllers/shiftController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/active', shiftController.getActiveShift);
router.post('/open', shiftController.openShift);
router.post('/:id/close', shiftController.closeShift);
router.get('/history', shiftController.getHistory);
router.get('/:id/transactions', shiftController.getShiftTransactions);

export default router;
