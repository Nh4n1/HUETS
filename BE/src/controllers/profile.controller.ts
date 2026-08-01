import type { Request, Response } from 'express';
import { getCurrentUser } from '../services/profile.service.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { ApiError } from '../utils/apiError.ts';
import { sendSuccess } from '../utils/response.ts';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }

    const user = await getCurrentUser(req.user.id);
    return sendSuccess(res, 200, user);
});
