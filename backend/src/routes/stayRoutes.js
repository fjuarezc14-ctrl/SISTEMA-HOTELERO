import { Router } from 'express';
import { stayController } from '../controllers/stayController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/active', stayController.getAllActive);
router.get('/history', stayController.getHistory);
router.get('/room/:roomId', stayController.getByRoom);
router.post('/checkin', stayController.checkIn);
router.post('/checkout', stayController.checkOut);
router.post('/:id/extra-hours', stayController.addExtraHours);

export default router;
