import { Router } from 'express';
import * as reportController from '../../controllers/adminReport.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('mod', 'admin'));
router.get('/', reportController.getReports);
router.get('/:reportId', reportController.getReportById);
router.patch('/:reportId/status', reportController.updateReportStatus);

export default router;
