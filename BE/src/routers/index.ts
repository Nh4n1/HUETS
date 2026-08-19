import { Router } from 'express';
import accessRouter from './access/index.ts';
import locationRouter from './location/index.ts';
import locationSearchRouter from './locationSearch/index.ts';
import profileRouter from './profile/index.ts';
import referenceRouter from './reference/index.ts';
import uploadRouter from './upload/index.ts';
import adminLocationRouter from './adminLocation/index.ts';
import adminItineraryRouter from './adminItinerary/index.ts';
import itineraryRouter, { ownerItineraryRouter } from './itinerary/index.ts';
import bookmarkRouter from './bookmark/index.ts';

const router = Router();

router.get('/', (req, res, next) => {
  return res.status(200).json({
    status: 'success',
    message: 'Hello World',
  });
});

router.use('/api/auth', accessRouter);
router.use('/api/admin/locations', adminLocationRouter);
router.use('/api/admin/itineraries', adminItineraryRouter);
router.use('/api/location-search', locationSearchRouter);
router.use('/api/locations', locationRouter);
router.use('/api/itineraries', itineraryRouter);
router.use('/api/bookmarks', bookmarkRouter);
router.use('/api/me/itineraries', ownerItineraryRouter);
router.use('/api/me', profileRouter);
router.use('/api/reference', referenceRouter);
router.use('/api/uploads', uploadRouter);

export default router;