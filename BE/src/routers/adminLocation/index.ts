import { Router } from 'express';
import * as locationController from '../../controllers/location.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('mod', 'admin'));
router.get('/moderation', locationController.getAdminLocations);
router.get('/:locationId', locationController.getAdminLocationById);
router.patch('/:locationId', authorize('admin'), locationController.updateAdminLocation);
router.delete('/:locationId', authorize('admin'), locationController.deleteAdminLocation);
router.post('/:locationId/approve', locationController.approveLocation);
router.post('/:locationId/reject', locationController.rejectLocation);
router.post('/:locationId/hide', locationController.hideLocation);
router.post('/:locationId/restore', locationController.restoreLocation);

export default router;
