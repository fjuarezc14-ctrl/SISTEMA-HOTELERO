import { Router } from 'express';
import { textileController } from '../controllers/textileController.js';
import { authenticateToken, requireModule } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireModule('textiles'));

router.get('/items', textileController.listItems);
router.post('/items', textileController.createItem);
router.put('/items/:id', textileController.updateItem);
router.post('/items/:id/stock', textileController.addStock);
router.post('/items/:id/move', textileController.moveItem);
router.get('/laundry', textileController.listBatches);
router.post('/laundry', textileController.sendToLaundry);
router.post('/laundry/:id/return', textileController.returnFromLaundry);

export default router;
