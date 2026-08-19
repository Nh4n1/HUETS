import { Router } from 'express';
import * as userController from '../../controllers/user.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', userController.getAdminUsers);
router.post('/:userId/lock', userController.lockUser);
router.post('/:userId/unlock', userController.unlockUser);

export default router;