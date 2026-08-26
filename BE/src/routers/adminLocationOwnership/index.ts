import { Router } from 'express';
import * as controller from '../../controllers/locationOwnership.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', controller.getAdminOwnerships);
router.get('/:ownershipId', controller.getAdminOwnership);
router.post('/:ownershipId/approve', controller.approveOwnership);
router.post('/:ownershipId/reject', controller.rejectOwnership);
router.post('/:ownershipId/revoke', controller.revokeOwnership);

export default router;
