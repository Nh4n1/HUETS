import type { Request, Response } from 'express';
import * as feedbackService from '../services/feedback.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const param = (value: string | string[] | undefined) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

export const getFeedbackList = asyncHandler(async (req: Request, res: Response) => {
    const result = await feedbackService.getAdminFeedbackList(req.query);
    return sendSuccess(res, 200, result.data, result.meta);
});

export const getFeedbackDetail = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await feedbackService.getAdminFeedbackDetail(param(req.params.feedbackId))));

export const updateFeedback = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return sendSuccess(res, 200, await feedbackService.updateAdminFeedback(
        param(req.params.feedbackId), req.body, req.user.id,
    ));
});
