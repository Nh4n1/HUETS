import { Router } from 'express';
import * as controller from '../../controllers/locationOwnership.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';
import * as voucherController from '../../controllers/voucher.controller.ts';
import * as redemptionController from '../../controllers/redemption.controller.ts';

const router = Router();
router.use(authenticate, authorize('user'));
router.get('/locations', controller.getBusinessLocations);
router.get('/locations/:locationId/vouchers', voucherController.getOwnerVouchers);
router.post('/locations/:locationId/vouchers', voucherController.createVoucher);
router.get('/locations/:locationId/vouchers/:voucherId', voucherController.getOwnerVoucher);
router.patch('/locations/:locationId/vouchers/:voucherId', voucherController.updateVoucher);
router.delete('/locations/:locationId/vouchers/:voucherId', voucherController.deleteVoucher);
router.post('/locations/:locationId/vouchers/:voucherId/publish', voucherController.publishVoucher);
router.post('/locations/:locationId/vouchers/:voucherId/pause', voucherController.pauseVoucher);
router.post('/locations/:locationId/vouchers/:voucherId/resume', voucherController.resumeVoucher);
router.post('/locations/:locationId/vouchers/:voucherId/end', voucherController.endVoucher);
router.get('/locations/:locationId/redemption-devices', redemptionController.getDevices);
router.post('/locations/:locationId/device-activation-codes', redemptionController.createActivationCode);
router.delete('/locations/:locationId/redemption-devices/:deviceId', redemptionController.revokeDevice);

export default router;
