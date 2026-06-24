import { Router } from 'express';
import * as ctrl from '../controllers/warehouses.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listWarehouses);
router.get('/analytics', authorize('admin'), ctrl.getWarehouseAnalytics);
router.get('/:id', ctrl.getWarehouse);
router.post('/', authorize('admin'), ctrl.createWarehouse);
router.put('/:id', authorize('admin'), ctrl.updateWarehouse);
router.delete('/:id', authorize('admin'), ctrl.deleteWarehouse);

export default router;
