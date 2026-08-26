import { Router } from 'express';
import * as controller from '../../controllers/voucher.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();
router.get('/:voucherId', controller.getPublicVoucher);
router.post('/:voucherId/claims', authenticate, authorize('user', 'mod', 'admin'), controller.claimVoucher);

export default router;
