import { Router } from 'express';
import { changePassword, getMe, updateMe } from '../../controllers/profile.controller.ts';
import { authenticate } from '../../middlewares/auth.middleware.ts';
import { getMyBookmarks } from '../../controllers/bookmark.controller.ts';

const router = Router();

router.get('/', authenticate, getMe);
router.patch('/', authenticate, updateMe);
router.post('/change-password', authenticate, changePassword);
router.get('/bookmarks', authenticate, getMyBookmarks);

export default router;
