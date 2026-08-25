import { Router } from 'express';
import * as aiItineraryController from '../../controllers/aiItinerary.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();
router.use(authenticate, authorize('user', 'mod', 'admin'));
router.post('/', aiItineraryController.createPlan);
router.get('/:planId', aiItineraryController.getPlan);
router.patch('/:planId', aiItineraryController.updatePlan);

export default router;
