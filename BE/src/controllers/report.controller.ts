import type { Request, Response } from 'express';
import * as reportService from '../services/report.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

export const createReport = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const report = await reportService.createReport(req.body, req.user.id);
    return sendSuccess(res, 201, report);
});
