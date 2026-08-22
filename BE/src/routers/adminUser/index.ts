import { Router } from 'express';
import * as userController from '../../controllers/user.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', userController.getAdminUsers);
router.get('/stats', userController.getAdminUserStats);
router.get('/:userId', userController.getAdminUserById);
router.post('/', userController.createManagedUser);
router.patch('/:userId/role', userController.changeUserRole);
router.post('/:userId/lock', userController.lockUser);
router.post('/:userId/unlock', userController.unlockUser);
router.post('/:userId/revoke-sessions', userController.revokeUserSessions);

export default router;
