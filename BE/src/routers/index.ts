import { Router } from 'express';
import accessRouter from './access/index.ts';
import locationRouter from './location/index.ts';
import profileRouter from './profile/index.ts';
import referenceRouter from './reference/index.ts';
import uploadRouter from './upload/index.ts';

const router = Router();

router.get('/', (req, res, next) => {
  return res.status(200).json({
    status: 'success',
    message: 'Hello World',
  });
});

router.use('/api/auth', accessRouter);
router.use('/api/locations', locationRouter);
router.use('/api/me', profileRouter);
router.use('/api/reference', referenceRouter);
router.use('/api/uploads', uploadRouter);

export default router;
