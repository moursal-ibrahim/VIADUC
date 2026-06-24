import { Router } from 'express';
import { body } from 'express-validator';
import * as authCtrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('password').optional().isLength({ min: 6 }),
  ],
  validate,
  authCtrl.login
);

router.post('/logout', authenticate, authCtrl.logout);
router.get('/me', authenticate, authCtrl.getMe);

export default router;
