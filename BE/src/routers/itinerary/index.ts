import { Router } from 'express';
import * as itineraryController from '../../controllers/itinerary.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();
export const ownerItineraryRouter = Router();

// Community itinerary routes.
router.get('/', itineraryController.getPublicItineraries);
router.get('/:id', itineraryController.getPublicItineraryById);

// Authenticated mutations. Service-level filters still enforce ownership for
// update/delete and public-source constraints for copy.
router.post('/', authenticate, authorize('user', 'admin'), itineraryController.createItinerary);
router.post('/:id/copy', authenticate, authorize('user', 'admin'), itineraryController.copyPublicItinerary);
router.patch('/:id', authenticate, authorize('user', 'admin'), itineraryController.updateItinerary);
router.delete('/:id', authenticate, authorize('user', 'admin'), itineraryController.deleteItinerary);

// Current user's private/public/hidden itineraries.
ownerItineraryRouter.use(authenticate, authorize('user', 'admin'));
ownerItineraryRouter.get('/', itineraryController.getItineraries);
ownerItineraryRouter.get('/:id', itineraryController.getItineraryById);

export default router;
