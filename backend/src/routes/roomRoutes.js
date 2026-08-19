import { Router } from 'express';
import { roomController } from '../controllers/roomController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticateToken);

// Tipos de habitación y tarifas
router.get('/types', roomController.getAllRoomTypes);
router.post('/types', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), roomController.createRoomType);
router.put('/types/:id/rates', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), roomController.updateRoomTypeRates);

// Habitaciones
router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);
router.post('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), roomController.createRoom);
router.put('/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), roomController.updateRoom);
router.patch('/:id/status', roomController.updateStatus);
router.delete('/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), roomController.deleteRoom);

export default router;
