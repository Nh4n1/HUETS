import { Router } from 'express';
import * as referenceController from '../../controllers/reference.controller.ts';

const router = Router();

router.get('/categories', referenceController.getCategories);
router.get('/categories/:categoryCode/tags', referenceController.getTagsByCategory);
router.get('/wards', referenceController.getWards);

export default router;
