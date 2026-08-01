import { Router } from 'express';
import { getMe } from '../../controllers/profile.controller.ts';
import { authenticate } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.get('/', authenticate, getMe);

export default router;
