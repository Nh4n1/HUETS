import { Router } from 'express';
import * as locationSearchController from '../../controllers/locationSearch.controller.ts';
import { locationSearchProtectionConfig } from '../../config/locationSearchProtection.config.ts';
import { createRateLimit } from '../../middlewares/rateLimit.middleware.ts';

const router = Router();

const aiSearchRateLimit = createRateLimit({
    windowMs: locationSearchProtectionConfig.windowMs,
    maxRequests: locationSearchProtectionConfig.aiMaxRequests,
});
const executeSearchRateLimit = createRateLimit({
    windowMs: locationSearchProtectionConfig.windowMs,
    maxRequests: locationSearchProtectionConfig.executeMaxRequests,
});

router.post('/execute', executeSearchRateLimit, locationSearchController.executeLocationSearch);
router.post('/', aiSearchRateLimit, locationSearchController.searchLocations);

export default router;
