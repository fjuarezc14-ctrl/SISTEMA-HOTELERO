import { Router } from 'express';
import { stayController } from '../controllers/stayController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/active', requireModule('reception', 'store'), stayController.getAllActive);
router.get('/history', requireModule('reception'), stayController.getHistory);
router.get('/room/:roomId', requireModule('reception'), stayController.getByRoom);
router.get('/quote', requireModule('reception', 'reservations'), stayController.quoteCheckIn);
router.post('/checkin', requireModule('reception'), stayController.checkIn);
router.get('/:id/checkout-quote', requireModule('reception'), stayController.quoteCheckOut);
router.post('/checkout', requireModule('reception'), stayController.checkOut);
router.post('/:id/extra-hours', requireModule('reception'), stayController.addExtraHours);

export default router;
