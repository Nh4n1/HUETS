import type { Request, Response } from 'express';
import * as userService from '../services/user.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const queryString = (value: unknown) => typeof value === 'string' ? value : undefined;

const paramId = (value: unknown) => Array.isArray(value) ? (value[0] ?? '') : ((value as string) ?? '');

// [GET] /api/admin/users
export const getAdminUsers = asyncHandler(async (req: Request, res: Response) => {
    const query: userService.AdminUserQuery = {};
    const page = queryString(req.query.page);
    const pageSize = queryString(req.query.pageSize);
    const q = queryString(req.query.q);
    const role = queryString(req.query.role);
    const status = queryString(req.query.status);

    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (q !== undefined) query.q = q;
    if (role) query.role = role;
    if (status) query.status = status;

    const result = await userService.getAdminUsers(query);
    return sendSuccess(res, 200, result.data, result.meta);
});

// [POST] /api/admin/users/:userId/lock
export const lockUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const user = await userService.lockUser(paramId(req.params.userId), req.body ?? {}, req.user);
    return sendSuccess(res, 200, user);
});

// [POST] /api/admin/users/:userId/unlock
export const unlockUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const user = await userService.unlockUser(paramId(req.params.userId), req.user);
    return sendSuccess(res, 200, user);
});