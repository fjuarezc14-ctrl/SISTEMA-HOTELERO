import { Router } from 'express';
import { reservationController } from '../controllers/reservationController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', reservationController.getAll);
router.post('/', reservationController.create);
router.put('/:id', reservationController.update);
router.post('/:id/checkin', reservationController.convertToCheckIn);
router.patch('/:id/cancel', reservationController.cancel);
router.patch('/:id/no-show', reservationController.noShow);

export default router;
