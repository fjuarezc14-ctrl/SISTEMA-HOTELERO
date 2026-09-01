import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/kpis', reportController.getKPIs);
router.get('/mincetur', reportController.getMincetur);

export default router;
