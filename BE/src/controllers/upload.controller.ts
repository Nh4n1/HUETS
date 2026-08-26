import type { Request, Response } from 'express';
import * as uploadService from '../services/upload.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

// [GET] /api/uploads/location-images/signature
export const getUploadSignature = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }

    const signature = uploadService.getUploadSignature();
    return sendSuccess(res, 200, signature);
});

// [POST] /api/uploads/location-images
export const confirmLocationImages = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }

    const result = await uploadService.confirmLocationImageUploads(req.body?.results, req.user.id);
    return sendSuccess(res, 201, result);
});

export const confirmFeedbackImages = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return sendSuccess(res, 201, await uploadService.confirmFeedbackImageUploads(req.body?.results, req.user.id));
});

export const confirmReportImages = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return sendSuccess(res, 201, await uploadService.confirmReportImageUploads(req.body?.results, req.user.id));
});

export const confirmOwnershipEvidence = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return sendSuccess(
        res,
        201,
        await uploadService.confirmOwnershipEvidenceUploads(req.body?.results, req.user.id),
    );
});

export const deleteReportImage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    await uploadService.deleteUploadedImage(req.body?.publicId);
    return sendSuccess(res, 200, { deleted: true });
});

// [POST] /api/uploads/location-images/delete
export const deleteLocationImage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }

    await uploadService.deleteLocationImage(req.body?.publicId);
    return sendSuccess(res, 200, { deleted: true });
});
