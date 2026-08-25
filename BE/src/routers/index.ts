import { Router } from 'express';
import accessRouter from './access/index.ts';
import locationRouter, { ownerLocationRouter } from './location/index.ts';
import locationSearchRouter from './locationSearch/index.ts';
import profileRouter from './profile/index.ts';
import referenceRouter from './reference/index.ts';
import uploadRouter from './upload/index.ts';
import adminLocationRouter from './adminLocation/index.ts';
import adminUserRouter from './adminUser/index.ts';
import adminItineraryRouter from './adminItinerary/index.ts';
import itineraryRouter, { ownerItineraryRouter } from './itinerary/index.ts';
import bookmarkRouter from './bookmark/index.ts';
import adminLocationReviewRouter from './adminLocationReview/index.ts';
import adminDashboardRouter from './adminDashboard/index.ts';
import reportRouter from './report/index.ts';
import adminReportRouter from './adminReport/index.ts';
import adminReferenceRouter from './adminReference/index.ts';
import feedbackRouter from './feedback/index.ts';
import adminFeedbackRouter from './adminFeedback/index.ts';
import notificationRouter from './notification/index.ts';
import aiItineraryRouter from './aiItinerary/index.ts';

const router = Router();

router.get('/', (req, res, next) => {
  return res.status(200).json({
    status: 'success',
    message: 'Hello World',
  });
});

router.use('/api/auth', accessRouter);
router.use('/api/admin/dashboard', adminDashboardRouter);
router.use('/api/admin/locations', adminLocationRouter);
router.use('/api/admin/reviews', adminLocationReviewRouter);
router.use('/api/admin/users', adminUserRouter);
router.use('/api/admin/itineraries', adminItineraryRouter);
router.use('/api/admin/reports', adminReportRouter);
router.use('/api/admin/reference', adminReferenceRouter);
router.use('/api/admin/feedback', adminFeedbackRouter);
router.use('/api/feedback', feedbackRouter);
router.use('/api/me/notifications', notificationRouter);
router.use('/api/location-search', locationSearchRouter);
router.use('/api/locations', locationRouter);
router.use('/api/itineraries', itineraryRouter);
router.use('/api/ai-itinerary-plans', aiItineraryRouter);
router.use('/api/bookmarks', bookmarkRouter);
router.use('/api/reports', reportRouter);
router.use('/api/me/itineraries', ownerItineraryRouter);
router.use('/api/me/locations', ownerLocationRouter);
router.use('/api/me', profileRouter);
router.use('/api/reference', referenceRouter);
router.use('/api/uploads', uploadRouter);

export default router;
