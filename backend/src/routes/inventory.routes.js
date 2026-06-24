import { Router } from 'express';
import * as ctrl from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listInventory);
router.get('/history', ctrl.getMovementHistory);
router.get('/alerts/low-stock', authorize('admin'), ctrl.getLowStockAlerts);
router.get('/transfers', ctrl.listTransfers);
router.post('/transfers', authorize('admin'), ctrl.transferStock);
router.get('/:id', ctrl.getInventoryItem);
router.post('/', ctrl.createInventory);
router.put('/:id', authorize('admin'), ctrl.updateInventory);
router.delete('/:id', authorize('admin'), ctrl.deleteInventory);

export default router;
