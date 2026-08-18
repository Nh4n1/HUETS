import type { Request, Response } from 'express';
import * as reportService from '../services/report.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const getCurrentUserId = (req: Request) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    return req.user.id;
};

export const createReport = asyncHandler(async (req: Request, res: Response) => {
    const reporterId = getCurrentUserId(req);
    const payload = await reportService.createReport({
        reporterId,
        targetType: req.body?.targetType,
        targetId: req.body?.targetId,
        reasonCode: req.body?.reasonCode,
        detail: req.body?.detail,
    });

    return sendSuccess(res, 201, payload);
});