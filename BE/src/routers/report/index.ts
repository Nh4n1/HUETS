import { Router } from 'express';
import * as reportController from '../../controllers/report.controller.ts';
import { reportProtectionConfig } from '../../config/reportProtection.config.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';
import { createRateLimit } from '../../middlewares/rateLimit.middleware.ts';

const router = Router();
const createReportRateLimit = createRateLimit({
    windowMs: reportProtectionConfig.windowMs,
    maxRequests: reportProtectionConfig.maxRequests,
    keyGenerator: (req) => req.user ? `user:${req.user.id}` : undefined,
});

router.post(
    '/',
    authenticate,
    createReportRateLimit,
    authorize('user', 'mod', 'admin'),
    reportController.createReport,
);

export default router;
