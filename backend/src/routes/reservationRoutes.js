import { Router } from 'express';
import { reservationController } from '../controllers/reservationController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireModule('reception', 'reservations'), reservationController.getAll);
router.get('/quote', requireModule('reception', 'reservations'), reservationController.quote);
router.post('/', requireModule('reception', 'reservations'), reservationController.create);
router.put('/:id', requireModule('reception', 'reservations'), reservationController.update);
router.post('/:id/checkin', requireModule('reception', 'reservations'), reservationController.convertToCheckIn);
router.patch('/:id/cancel', requireModule('reception', 'reservations'), reservationController.cancel);
router.patch('/:id/no-show', requireModule('reception', 'reservations'), reservationController.noShow);

export default router;
