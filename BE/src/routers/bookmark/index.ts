import { Router } from 'express';
import * as bookmarkController from '../../controllers/bookmark.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, authorize('user', 'mod', 'admin'), bookmarkController.createBookmark);
router.delete('/:targetType/:targetId', authenticate, authorize('user', 'mod', 'admin'), bookmarkController.deleteBookmark);


export default router;
