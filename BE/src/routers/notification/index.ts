import { Router } from 'express';
import * as notificationController from '../../controllers/notification.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.get('/', authenticate, authorize('user', 'mod', 'admin'), notificationController.getMyNotifications);
router.patch('/read-all', authenticate, authorize('user', 'mod', 'admin'), notificationController.markAllRead);
router.patch('/:notificationId/read', authenticate, authorize('user', 'mod', 'admin'), notificationController.markRead);

export default router;
