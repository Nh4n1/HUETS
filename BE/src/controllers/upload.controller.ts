import type { Request, Response } from 'express';
import * as uploadService from '../services/upload.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

// [POST] /api/uploads/location-images
export const uploadLocationImages = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const host = req.get('host');
    if (!host) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Request host không hợp lệ.');
    }

    const result = await uploadService.uploadLocationImages(
        files,
        req.user.id,
        `${req.protocol}://${host}`,
    );
    return sendSuccess(res, 201, result);
});
