import { Router } from 'express';
import * as uploadController from '../../controllers/upload.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.get(
    '/location-images/signature',
    authenticate,
    authorize('user', 'admin'),
    uploadController.getUploadSignature,
);

router.post(
    '/location-images',
    authenticate,
    authorize('user', 'admin'),
    uploadController.confirmLocationImages,
);

router.post(
    '/location-images/delete',
    authenticate,
    authorize('user', 'admin'),
    uploadController.deleteLocationImage,
);

export default router;
