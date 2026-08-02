import type { Request, Response } from 'express';
import * as referenceService from '../services/reference.service.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await referenceService.getCategories();
    return sendSuccess(res, 200, categories);
});

export const getTagsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryCode = req.params.categoryCode;
    const result = await referenceService.getTagsByCategory(
        Array.isArray(categoryCode) ? (categoryCode[0] ?? '') : (categoryCode ?? ''),
    );
    return sendSuccess(res, 200, result);
});

export const getWards = asyncHandler(async (_req: Request, res: Response) => {
    const wards = referenceService.getWards();
    return sendSuccess(res, 200, wards);
});
