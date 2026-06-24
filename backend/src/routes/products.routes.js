import { Router } from 'express';
import * as ctrl from '../controllers/products.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listProducts);
router.get('/pricing/all', ctrl.listPricing);
router.post('/pricing', authorize('admin'), ctrl.upsertPricing);
router.get('/wholesale/all', ctrl.listWholesalePricing);
router.post('/wholesale', authorize('admin'), ctrl.createWholesalePricing);
router.put('/wholesale/:id', authorize('admin'), ctrl.updateWholesalePricing);
router.delete('/wholesale/:id', authorize('admin'), ctrl.deleteWholesalePricing);
router.get('/:id', ctrl.getProduct);
router.post('/', authorize('admin'), ctrl.createProduct);
router.put('/:id', authorize('admin'), ctrl.updateProduct);
router.delete('/:id', authorize('admin'), ctrl.deleteProduct);

export default router;
