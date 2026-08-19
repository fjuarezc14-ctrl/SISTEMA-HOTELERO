import { Router } from 'express';
import { stayController } from '../controllers/stayController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/room/:roomId', stayController.getByRoom);
router.post('/checkin', stayController.checkIn);
router.post('/checkout', stayController.checkOut);

export default router;
