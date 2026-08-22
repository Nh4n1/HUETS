import { Router } from 'express';
import { getMe, updateMe } from '../../controllers/profile.controller.ts';
import { getMyBookmarks } from '../../controllers/bookmark.controller.ts';
import { getMyLocationReviews } from '../../controllers/locationReview.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.get('/', authenticate, getMe);
router.patch('/', authenticate, updateMe);
router.get('/bookmarks', authenticate, authorize('user', 'mod', 'admin'), getMyBookmarks);
router.get('/reviews', authenticate, authorize('user', 'mod', 'admin'), getMyLocationReviews);

export default router;
