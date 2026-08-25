import { Router } from 'express';
import * as itineraryController from '../../controllers/itinerary.controller.ts';
import * as aiItineraryController from '../../controllers/aiItinerary.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();
export const ownerItineraryRouter = Router();

// Community itinerary routes.
router.get('/', itineraryController.getPublicItineraries);
router.get('/:id', itineraryController.getPublicItineraryById);

// Authenticated mutations. Service-level filters still enforce ownership for
// update/delete and public-source constraints for copy.
router.post('/', authenticate, authorize('user', 'mod', 'admin'), itineraryController.createItinerary);
router.post('/from-plan', authenticate, authorize('user', 'mod', 'admin'), aiItineraryController.savePlan);
router.post('/:id/copy', authenticate, authorize('user', 'mod', 'admin'), itineraryController.copyPublicItinerary);
router.patch('/:id', authenticate, authorize('user', 'mod', 'admin'), itineraryController.updateItinerary);
router.delete('/:id', authenticate, authorize('user', 'mod', 'admin'), itineraryController.deleteItinerary);

// Current user's private/public/hidden itineraries.
ownerItineraryRouter.use(authenticate, authorize('user', 'mod', 'admin'));
ownerItineraryRouter.get('/', itineraryController.getItineraries);
ownerItineraryRouter.get('/:id', itineraryController.getItineraryById);

export default router;
