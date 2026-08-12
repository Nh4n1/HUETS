import { Router } from "express";
import * as locationController from "../../controllers/location.controller.ts";
import { authenticate, authorize } from "../../middlewares/auth.middleware.ts";
import * as locationReviewController from "../../controllers/locationReview.controller.ts";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("user", "admin"),
  locationController.createLocation,
);
router.get("/", locationController.getPublicLocations);
router.get("/search", locationController.searchPublicLocations);
router.get("/:locationId/reviews", locationReviewController.getLocationReviews);
router.put(
  "/:locationId/reviews/me",
  authenticate,
  authorize("user", "admin"),
  locationReviewController.saveLocationReview,
);
router.get("/:locationId", locationController.getPublicLocationById);

export default router;
