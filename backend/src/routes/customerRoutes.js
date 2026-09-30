import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireModule('reception', 'reservations', 'customers', 'incidents'), customerController.getAll);
router.get('/doc/:documentNumber', requireModule('reception', 'reservations', 'customers', 'incidents'), customerController.getByDocument);
router.get('/lookup/:documentNumber', requireModule('reception', 'reservations', 'customers', 'incidents'), customerController.lookup);
router.post('/', requireModule('reception', 'reservations', 'customers'), customerController.createOrUpdate);
router.patch('/:id/blacklist', requireModule('customers', 'incidents'), customerController.updateBlacklist);
router.patch('/:id/toggle-blacklist', requireModule('customers', 'incidents'), customerController.toggleBlacklist);

export default router;
