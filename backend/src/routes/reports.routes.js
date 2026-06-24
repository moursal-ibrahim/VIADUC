import { Router } from 'express';
import * as ctrl from '../controllers/reports.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', ctrl.listReports);
router.get('/two-day', ctrl.getTwoDayReport);
router.get('/two-day/due', ctrl.getTwoDayReportDue);
router.get('/two-day/export/pdf', ctrl.exportTwoDayReportPdf);
router.post('/generate', ctrl.generateReport);
router.get('/export/pdf', ctrl.exportReportPdf);
router.get('/export/excel', ctrl.exportReportExcel);

export default router;
