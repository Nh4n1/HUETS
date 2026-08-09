import { Router } from 'express';
import * as locationController from '../../controllers/location.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/moderation', locationController.getAdminLocations);
router.get('/:locationId', locationController.getAdminLocationById);
router.post('/:locationId/approve', locationController.approveLocation);
router.post('/:locationId/reject', locationController.rejectLocation);

export default router;
