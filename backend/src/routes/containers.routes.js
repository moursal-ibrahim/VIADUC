import { Router } from 'express';
import * as ctrl from '../controllers/containers.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listContainers);
router.get('/analytics', authorize('admin'), ctrl.getExportAnalytics);
router.get('/:id', ctrl.getContainer);
router.post('/', authorize('admin'), ctrl.createContainer);
router.put('/:id', authorize('admin'), ctrl.updateContainer);
router.delete('/:id', authorize('admin'), ctrl.deleteContainer);

export default router;
