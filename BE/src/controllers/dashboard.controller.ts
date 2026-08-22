import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return sendSuccess(res, 200, await dashboardService.getDashboard(req.user.role));
});
