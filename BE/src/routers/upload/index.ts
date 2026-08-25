import { Router } from 'express';
import * as uploadController from '../../controllers/upload.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';
import { createRateLimit } from '../../middlewares/rateLimit.middleware.ts';
import { reportProtectionConfig } from '../../config/reportProtection.config.ts';

const router = Router();
const reportUploadKey = (req: Parameters<ReturnType<typeof createRateLimit>>[0]) => req.user?.id;
const reportSignatureRateLimit = createRateLimit({
    windowMs: reportProtectionConfig.imageUploadWindowMs,
    maxRequests: reportProtectionConfig.imageUploadMaxRequests,
    keyGenerator: reportUploadKey,
});
const reportConfirmRateLimit = createRateLimit({
    windowMs: reportProtectionConfig.imageUploadWindowMs,
    maxRequests: reportProtectionConfig.imageUploadMaxRequests,
    keyGenerator: reportUploadKey,
});

router.get(
    '/location-images/signature',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.getUploadSignature,
);

router.post(
    '/location-images',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.confirmLocationImages,
);

router.get(
    '/feedback-images/signature',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.getUploadSignature,
);

router.post(
    '/feedback-images',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.confirmFeedbackImages,
);

router.get(
    '/report-images/signature',
    authenticate,
    authorize('user', 'mod', 'admin'),
    reportSignatureRateLimit,
    uploadController.getUploadSignature,
);

router.post(
    '/report-images',
    authenticate,
    authorize('user', 'mod', 'admin'),
    reportConfirmRateLimit,
    uploadController.confirmReportImages,
);

router.post(
    '/report-images/delete',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.deleteReportImage,
);

router.post(
    '/location-images/delete',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.deleteLocationImage,
);

export default router;
