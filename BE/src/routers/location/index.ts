import { Router } from "express";
import * as locationController from "../../controllers/location.controller.ts";
import { authenticate, authorize, optionalAuthenticate } from "../../middlewares/auth.middleware.ts";
import * as locationReviewController from "../../controllers/locationReview.controller.ts";
import * as locationOwnershipController from "../../controllers/locationOwnership.controller.ts";
import * as voucherController from "../../controllers/voucher.controller.ts";

const router = Router();
export const ownerLocationRouter = Router();

router.post(
  "/",
  authenticate,
  authorize("user", "mod", "admin"),
  locationController.createLocation,
);
router.get("/", locationController.getPublicLocations);
router.get("/search", locationController.searchPublicLocations);
router.get("/:locationId/vouchers", optionalAuthenticate, voucherController.getPublicLocationVouchers);
router.get(
  "/:locationId/ownership-context",
  optionalAuthenticate,
  locationOwnershipController.getLocationOwnershipContext,
);
router.get("/:locationId/reviews", locationReviewController.getLocationReviews);
router.get(
  "/:locationId/reviews/me",
  authenticate,
  authorize("user", "mod", "admin"),
  locationReviewController.getMyLocationReview,
);
router.put(
  "/:locationId/reviews/me",
  authenticate,
  authorize("user", "mod", "admin"),
  locationReviewController.saveLocationReview,
);
router.delete(
  "/:locationId/reviews/me",
  authenticate,
  authorize("user", "mod", "admin"),
  locationReviewController.deleteMyLocationReview,
);
router.get("/:locationId", locationController.getPublicLocationById);

// Current user's own contributed locations, any status (pending/approved/rejected/...).
ownerLocationRouter.get(
  "/",
  authenticate,
  authorize("user", "mod", "admin"),
  locationController.getMyLocations,
);

export default router;
