import { Router } from 'express';
import * as controller from '../../controllers/voucher.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';
import * as redemptionController from '../../controllers/redemption.controller.ts';

const router = Router();
router.use(authenticate, authorize('user', 'mod', 'admin'));
router.get('/', controller.getMyVoucherClaims);
router.get('/:claimId', controller.getMyVoucherClaim);
router.post('/:claimId/redemption-sessions', redemptionController.createRedemptionSession);
router.get('/:claimId/status', controller.getMyVoucherClaim);

export default router;
