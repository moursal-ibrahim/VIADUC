import { Router } from 'express';
import * as ctrl from '../controllers/finance.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/dashboard', ctrl.getFinanceDashboard);
router.get('/expenses', ctrl.listExpenses);
router.post('/expenses', ctrl.createExpense);
router.put('/expenses/:id', ctrl.updateExpense);
router.delete('/expenses/:id', ctrl.deleteExpense);
router.get('/salaries', ctrl.listSalaries);
router.post('/salaries', ctrl.createSalary);
router.get('/transfers', ctrl.listMoneyTransfers);
router.post('/transfers', ctrl.createMoneyTransfer);
router.get('/warehouse-transfers', ctrl.listWarehouseTransfers);
router.post('/warehouse-transfers', ctrl.createWarehouseTransfer);

export default router;
