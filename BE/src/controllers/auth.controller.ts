import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';
import * as authService from '../services/auth.service.ts';

export const register = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    return sendSuccess(res, 201, user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login({
        ...req.body,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
    });
    return sendSuccess(res, 200, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    return sendSuccess(res, 200, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    return res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    return sendSuccess(res, 200, { message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    return sendSuccess(res, 200, { message: 'Đặt lại mật khẩu thành công.' });
});
