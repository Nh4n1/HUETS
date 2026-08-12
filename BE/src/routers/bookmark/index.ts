import { Router } from 'express';
import * as bookmarkController from '../../controllers/bookmark.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('user', 'admin'));
router.post('/', bookmarkController.addBookmark);
router.delete('/:targetType/:targetId', bookmarkController.removeBookmark);

export default router;
