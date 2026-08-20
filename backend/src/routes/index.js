import { Router } from 'express';
import authRoutes from './authRoutes.js';
import customerRoutes from './customerRoutes.js';
import roomRoutes from './roomRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import stayRoutes from './stayRoutes.js';
import cashRoutes from './cashRoutes.js';
import productRoutes from './productRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import userRoutes from './userRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import reservationRoutes from './reservationRoutes.js';
import receiptRoutes from './receiptRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/shifts', shiftRoutes);
apiRouter.use('/stays', stayRoutes);
apiRouter.use('/cash', cashRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/maintenance', maintenanceRoutes);
apiRouter.use('/reservations', reservationRoutes);
apiRouter.use('/receipts', receiptRoutes);

export default apiRouter;
