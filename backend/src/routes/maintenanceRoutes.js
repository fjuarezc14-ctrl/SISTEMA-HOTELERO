import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenanceController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', maintenanceController.getAll);
router.post('/', maintenanceController.create);
router.patch('/:id/resolve', maintenanceController.resolve);

export default router;
