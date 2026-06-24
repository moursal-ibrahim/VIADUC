import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import warehousesRoutes from './warehouses.routes.js';
import productsRoutes from './products.routes.js';
import inventoryRoutes from './inventory.routes.js';
import financeRoutes from './finance.routes.js';
import containersRoutes from './containers.routes.js';
import reportsRoutes from './reports.routes.js';
import analyticsRoutes from './analytics.routes.js';
import openingStockRoutes from './openingStock.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Viaduc ERP API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/warehouses', warehousesRoutes);
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/finance', financeRoutes);
router.use('/containers', containersRoutes);
router.use('/reports', reportsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/opening-stock', openingStockRoutes);

export default router;
