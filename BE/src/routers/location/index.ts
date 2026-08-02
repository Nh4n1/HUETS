import { Router } from 'express';
import * as locationController from '../../controllers/location.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, authorize('user', 'admin'), locationController.createLocation);
router.get('/', locationController.getPublicLocations);
router.get('/:locationId', locationController.getPublicLocationById);

export default router;
