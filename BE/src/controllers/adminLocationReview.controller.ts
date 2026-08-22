import type { Request, Response } from 'express';
import * as reviewService from '../services/locationReview.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const param = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

export const getReviews = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.getAdminLocationReviews({
        page: typeof req.query.page === 'string' ? req.query.page : undefined,
        pageSize: typeof req.query.pageSize === 'string' ? req.query.pageSize : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        rating: typeof req.query.rating === 'string' ? req.query.rating : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    return sendSuccess(res, 200, result.data, result.meta);
});

export const setVisibility = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const result = await reviewService.setLocationReviewVisibility(
        param(req.params.reviewId),
        req.body,
        req.user.id,
    );
    return sendSuccess(res, 200, result);
});
