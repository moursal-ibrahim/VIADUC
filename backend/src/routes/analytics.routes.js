import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, authorize('admin'), ctrl.getDashboardAnalytics);
router.get('/seller', authenticate, authorize('seller', 'admin'), ctrl.getSellerDashboard);
router.post('/entries', authenticate, authorize('seller', 'admin'), ctrl.createEntry);
router.post('/money-submissions', authenticate, authorize('seller', 'admin'), ctrl.createMoneySubmission);
router.get('/seller-funding', authenticate, authorize('seller', 'admin'), ctrl.listSellerFunding);
router.post('/seller-funding', authenticate, authorize('admin'), ctrl.fundSeller);

export default router;
