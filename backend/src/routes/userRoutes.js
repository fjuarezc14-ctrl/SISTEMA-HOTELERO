import { Router } from 'express';
import { userController } from '../controllers/settingsController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/', userController.getAll);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.post('/:id/reset-password', userController.resetPassword);

export default router;
