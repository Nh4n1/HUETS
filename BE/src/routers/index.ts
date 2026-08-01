import { Router } from 'express';
import accessRouter from './access/index.ts';
import profileRouter from './profile/index.ts';

const router = Router();

router.get('/', (req, res, next) => {
  return res.status(200).json({
    status: 'success',
    message: 'Hello World',
  });
});

router.use('/api/auth', accessRouter);
router.use('/api/me', profileRouter);

export default router;
