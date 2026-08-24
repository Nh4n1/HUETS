import { Router } from 'express';
import * as adminReferenceController from '../../controllers/adminReference.controller.ts';
import { authenticate, authorize } from '../../middlewares/auth.middleware.ts';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/categories', adminReferenceController.getCategories);
router.get('/categories/:categoryCode', adminReferenceController.getCategory);
router.post('/categories', adminReferenceController.createCategory);
router.patch('/categories/:categoryCode', adminReferenceController.updateCategory);
router.put('/categories/:categoryCode/tag-rules', adminReferenceController.updateCategoryTagRules);
router.get('/tag-groups', adminReferenceController.getTagGroups);
router.post('/tag-groups', adminReferenceController.createTagGroup);
router.patch('/tag-groups/:groupCode', adminReferenceController.updateTagGroup);
router.post('/tag-groups/:groupCode/tags', adminReferenceController.createTag);
router.patch('/tag-groups/:groupCode/tags/:tagCode', adminReferenceController.updateTag);

export default router;
