import { Router } from 'express';
import * as uploadController from '../../controllers/upload.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';
import { parseLocationImages } from '../../middlewares/locationImageUpload.middleware.ts';

const router = Router();

router.post(
    '/location-images',
    authenticate,
    authorize('user', 'admin'),
    parseLocationImages,
    uploadController.uploadLocationImages,
);

export default router;
