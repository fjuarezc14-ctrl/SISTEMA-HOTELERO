import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', customerController.getAll);
router.get('/doc/:documentNumber', customerController.getByDocument);
router.get('/lookup/:documentNumber', customerController.lookup);
router.post('/', customerController.createOrUpdate);
router.patch('/:id/blacklist', customerController.updateBlacklist);

export default router;
