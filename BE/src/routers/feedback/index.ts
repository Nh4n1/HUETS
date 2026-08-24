import { Router } from 'express';
import { feedbackProtectionConfig } from '../../config/feedbackProtection.config.ts';
import * as feedbackController from '../../controllers/feedback.controller.ts';
import { optionalAuthenticate } from '../../middlewares/auth.middleware.ts';
import { createRateLimit } from '../../middlewares/rateLimit.middleware.ts';

const router = Router();
const authenticatedRateLimit = createRateLimit({
    windowMs: feedbackProtectionConfig.windowMs,
    maxRequests: feedbackProtectionConfig.authenticatedMaxRequests,
    keyGenerator: (req) => req.user ? `user:${req.user.id}` : undefined,
    skip: (req) => !req.user,
});
const guestRateLimit = createRateLimit({
    windowMs: feedbackProtectionConfig.windowMs,
    maxRequests: feedbackProtectionConfig.guestMaxRequests,
    skip: (req) => Boolean(req.user),
});

router.post('/', optionalAuthenticate, authenticatedRateLimit, guestRateLimit, feedbackController.createFeedback);

export default router;
