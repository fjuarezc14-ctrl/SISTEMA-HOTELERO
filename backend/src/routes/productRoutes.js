import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticateToken);

router.get('/', productController.getAll);
router.post('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), productController.create);
router.put('/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), productController.update);
router.post('/charge-room', productController.chargeToRoom);
router.post('/direct-sale', productController.directSale);
router.post('/purchase', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), productController.registerPurchase);
router.get('/purchases', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), productController.getPurchases);
router.get('/kardex', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), productController.getKardex);

export default router;
