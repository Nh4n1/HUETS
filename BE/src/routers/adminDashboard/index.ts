import { Router } from 'express';
import * as dashboardController from '../../controllers/dashboard.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('mod', 'admin'));
router.get('/', dashboardController.getDashboard);

export default router;
