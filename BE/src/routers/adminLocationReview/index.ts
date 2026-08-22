import { Router } from 'express';
import * as reviewController from '../../controllers/adminLocationReview.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('mod', 'admin'));
router.get('/', reviewController.getReviews);
router.patch('/:reviewId/status', reviewController.setVisibility);

export default router;
