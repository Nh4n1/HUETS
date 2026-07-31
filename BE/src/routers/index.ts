import { Router } from 'express';
import accessRouter from './access/index.ts';

const router = Router();

router.get('/', (req, res, next) => {
  return res.status(200).json({
    message: 'Hello World',
  });
});

router.use('/api/auth', accessRouter);

export default router;
