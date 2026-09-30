import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenanceController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireModule('reception', 'incidents'), maintenanceController.getAll);
router.post('/', requireModule('reception', 'incidents'), maintenanceController.create);
router.patch('/:id/resolve', requireModule('reception', 'incidents'), maintenanceController.resolve);

export default router;
