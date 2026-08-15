import { Router } from 'express';
import { getMe } from '../../controllers/profile.controller.ts';
import { getMyBookmarks } from '../../controllers/bookmark.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.get('/', authenticate, getMe);
router.get('/bookmarks', authenticate, authorize('user', 'admin'), getMyBookmarks);

export default router;
