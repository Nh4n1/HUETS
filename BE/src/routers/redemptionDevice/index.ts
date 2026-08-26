import { Router } from 'express';
import * as controller from '../../controllers/redemption.controller.ts';
import { authenticateRedemptionDevice } from '../../middlewares/redemptionDeviceAuth.middleware.ts';
import { createRateLimit } from '../../middlewares/rateLimit.middleware.ts';

const router = Router();
const activationLimit = createRateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 20 });
const redemptionLimit = createRateLimit({ windowMs: 60 * 1000, maxRequests: 60 });

router.post('/activate', activationLimit, controller.activateDevice);
router.use(authenticateRedemptionDevice);
router.get('/session', controller.getDeviceSession);
router.post('/logout', controller.logoutDevice);
router.post('/redemptions/verify', redemptionLimit, controller.verifyRedemption);
router.post('/redemptions/confirm', redemptionLimit, controller.confirmRedemption);

export default router;
