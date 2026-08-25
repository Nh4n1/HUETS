import type { Request, Response } from 'express';
import * as notificationService from '../services/notification.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const currentUserId = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user.id;
};

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await notificationService.getMyNotifications(currentUserId(req))));

export const markRead = asyncHandler(async (req: Request, res: Response) => {
    const rawNotificationId = req.params.notificationId;
    const notificationId = Array.isArray(rawNotificationId)
        ? rawNotificationId[0] ?? ''
        : rawNotificationId ?? '';
    return sendSuccess(
        res,
        200,
        await notificationService.markNotificationRead(currentUserId(req), notificationId),
    );
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await notificationService.markAllNotificationsRead(currentUserId(req))));
