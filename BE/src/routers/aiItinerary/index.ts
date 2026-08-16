import { Router } from 'express';
import * as aiItineraryController from '../../controllers/aiItinerary.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

// POST /api/ai-itinerary-plans -> Generate plan
router.post('/', authenticate, authorize('user', 'admin'), aiItineraryController.generatePlanController);

// GET /api/ai-itinerary-plans/:planId -> Get draft preview
router.get('/:planId', authenticate, authorize('user', 'admin'), aiItineraryController.getDraftPreviewController);

// GET /api/ai-itinerary-plans/:planId/items/:locationId/alternatives -> Get alternatives for item
router.get('/:planId/items/:locationId/alternatives', authenticate, authorize('user', 'admin'), aiItineraryController.getItemAlternativesController);

// PATCH /api/ai-itinerary-plans/:planId/items/:locationId/replace -> Replace item with alternative
router.patch('/:planId/items/:locationId/replace', authenticate, authorize('user', 'admin'), aiItineraryController.replaceDraftItemController);

// DELETE /api/ai-itinerary-plans/:planId/items/:locationId -> Delete item from draft
router.delete('/:planId/items/:locationId', authenticate, authorize('user', 'admin'), aiItineraryController.deleteDraftItemController);

// POST /api/ai-itinerary-plans/:planId/save -> Save draft as official itinerary
router.post('/:planId/save', authenticate, authorize('user', 'admin'), aiItineraryController.savePlanToItineraryController);

export default router;
