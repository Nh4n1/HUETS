import { Router } from 'express';
import * as reportController from '../../controllers/report.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, authorize('user', 'admin'), reportController.createReport);

export default router;