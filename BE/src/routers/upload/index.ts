import { Router } from 'express';
import * as uploadController from '../../controllers/upload.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

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

router.post(
    '/location-images/delete',
    authenticate,
    authorize('user', 'mod', 'admin'),
    uploadController.deleteLocationImage,
);

export default router;
