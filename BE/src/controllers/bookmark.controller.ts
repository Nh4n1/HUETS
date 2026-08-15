import type { Request, Response } from 'express';
import * as bookmarkService from '../services/bookmark.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const getCurrentUserId = (req: Request) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    return req.user.id;
};

export const createBookmark = asyncHandler(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const payload = await bookmarkService.createBookmark({
        userId,
        targetType: req.body?.targetType,
        targetId: req.body?.targetId,
    });

    return sendSuccess(res, 201, payload);
});

export const deleteBookmark = asyncHandler(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const targetType = req.params.targetType;
    const targetId = req.params.targetId;

    await bookmarkService.deleteBookmark({ userId, targetType, targetId });
    return res.status(204).send();
});

export const getMyBookmarks = asyncHandler(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const rawType = typeof req.query.type === 'string' ? req.query.type : undefined;
    const bookmarks = await bookmarkService.getUserBookmarks(userId, rawType);
    return sendSuccess(res, 200, bookmarks);
});
