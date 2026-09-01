import { Router } from 'express';
import { incidentController } from '../controllers/incidentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', incidentController.getAll);
router.post('/', incidentController.create);
router.patch('/:id/resolve', incidentController.resolve);

export default router;
