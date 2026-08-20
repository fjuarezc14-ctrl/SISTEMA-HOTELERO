import { Router } from 'express';
import { reservationController } from '../controllers/reservationController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', reservationController.getAll);
router.post('/', reservationController.create);
router.post('/:id/checkin', reservationController.convertToCheckIn);
router.patch('/:id/cancel', reservationController.cancel);

export default router;
