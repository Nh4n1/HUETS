import { Router } from 'express';
import * as adminFeedbackController from '../../controllers/adminFeedback.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', adminFeedbackController.getFeedbackList);
router.get('/:feedbackId', adminFeedbackController.getFeedbackDetail);
router.patch('/:feedbackId', adminFeedbackController.updateFeedback);

export default router;
