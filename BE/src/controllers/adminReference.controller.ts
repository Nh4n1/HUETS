import type { Request, Response } from 'express';
import * as adminReferenceService from '../services/adminReference.service.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const param = (value: string | string[] | undefined) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
const queryString = (value: unknown) => typeof value === 'string' ? value : undefined;

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const query: adminReferenceService.AdminCategoryQuery = {};
    const q = queryString(req.query.q);
    const status = queryString(req.query.status);
    if (q !== undefined) query.q = q;
    if (status !== undefined) query.status = status;
    return sendSuccess(res, 200, await adminReferenceService.getCategories(query));
});

export const getCategory = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await adminReferenceService.getCategory(param(req.params.categoryCode))));

export const createCategory = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await adminReferenceService.createCategory(req.body)));

export const updateCategory = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await adminReferenceService.updateCategory(param(req.params.categoryCode), req.body)));

export const updateCategoryTagRules = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await adminReferenceService.updateCategoryTagRules(param(req.params.categoryCode), req.body)));

export const getTagGroups = asyncHandler(async (_req: Request, res: Response) =>
    sendSuccess(res, 200, await adminReferenceService.getTagGroups()));

export const createTagGroup = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await adminReferenceService.createTagGroup(req.body)));

export const updateTagGroup = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await adminReferenceService.updateTagGroup(param(req.params.groupCode), req.body)));

export const createTag = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await adminReferenceService.createTag(param(req.params.groupCode), req.body)));

export const updateTag = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await adminReferenceService.updateTag(
        param(req.params.groupCode),
        param(req.params.tagCode),
        req.body,
    )));
