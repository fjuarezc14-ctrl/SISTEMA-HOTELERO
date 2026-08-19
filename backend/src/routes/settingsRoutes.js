import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticateToken);

router.get('/hotel-info', settingsController.getHotelInfo);
router.put('/hotel-info', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), settingsController.updateHotelInfo);
router.get('/audit-logs', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), settingsController.getAuditLogs);

export default router;
