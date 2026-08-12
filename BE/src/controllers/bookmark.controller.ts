import type { Request, Response } from 'express';
import * as bookmarkService from '../services/bookmark.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const currentUserId = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user.id;
};

const param = (req: Request, name: string) => {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value;
};

export const addBookmark = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await bookmarkService.addBookmark(currentUserId(req), req.body ?? {})));

export const removeBookmark = asyncHandler(async (req: Request, res: Response) => {
    await bookmarkService.removeBookmark(currentUserId(req), param(req, 'targetType'), param(req, 'targetId'));
    return res.status(204).send();
});

export const getMyBookmarks = asyncHandler(async (req: Request, res: Response) => {
    const result = await bookmarkService.getMyBookmarks(currentUserId(req), {
        targetType: req.query.targetType,
        page: req.query.page,
        pageSize: req.query.pageSize,
    });
    return sendSuccess(res, 200, result.data, result.meta);
});
