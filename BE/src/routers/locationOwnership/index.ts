import { Router } from 'express';
import * as controller from '../../controllers/locationOwnership.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();
router.use(authenticate, authorize('user'));
router.post('/', controller.createOwnership);

export const myLocationOwnershipRouter = Router();
myLocationOwnershipRouter.use(authenticate, authorize('user'));
myLocationOwnershipRouter.get('/', controller.getMyOwnerships);
myLocationOwnershipRouter.get('/:ownershipId', controller.getMyOwnership);
myLocationOwnershipRouter.patch('/:ownershipId', controller.updateMyOwnership);
myLocationOwnershipRouter.post('/:ownershipId/resubmit', controller.resubmitMyOwnership);
myLocationOwnershipRouter.post('/:ownershipId/cancel', controller.cancelMyOwnership);

export const businessSummaryRouter = Router();
businessSummaryRouter.use(authenticate, authorize('user'));
businessSummaryRouter.get('/', controller.getBusinessSummary);

export default router;
