import { Router } from 'express';
import * as ctrl from '../controllers/openingStock.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', ctrl.listOpeningStock);
router.get('/status', ctrl.getOpeningStatus);
router.post('/snapshot', ctrl.saveOpeningSnapshot);

export default router;
