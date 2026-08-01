import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';
import * as authService from '../services/auth.service.ts';

//[POST] /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    return sendSuccess(res, 201, user);
});
//[POST] /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login({
        ...req.body,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
    });
    return sendSuccess(res, 200, result);
});
//[POST] /api/auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    return sendSuccess(res, 200, result);
});

//[POST] /api/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    return res.status(204).send();
});
