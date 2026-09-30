import { Router } from 'express';
import { incidentController } from '../controllers/incidentController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireModule('incidents'), incidentController.getAll);
router.post('/', requireModule('incidents'), incidentController.create);
router.patch('/:id/resolve', requireModule('incidents'), incidentController.resolve);

export default router;
