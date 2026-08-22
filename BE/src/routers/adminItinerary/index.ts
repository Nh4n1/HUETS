import { Router } from 'express';
import * as itineraryController from '../../controllers/itinerary.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', itineraryController.getAdminItineraries);
router.get('/:id', itineraryController.getAdminItineraryById);
router.patch('/:id', itineraryController.moderateItinerary);

export default router;
