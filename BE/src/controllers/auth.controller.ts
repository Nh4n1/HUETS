import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';
import * as authService from '../services/auth.service.ts';
import {
    refreshTokenCookieClearOptions,
    refreshTokenCookieName,
    refreshTokenCookieOptions,
} from '../config/config.authCookie.ts';

//[POST] /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    return sendSuccess(res, 201, user);
});
//[POST] /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, ...result } = await authService.login({
        ...req.body,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
    });
    res.cookie(refreshTokenCookieName, refreshToken, refreshTokenCookieOptions);
    return sendSuccess(res, 200, result);
});
//[POST] /api/auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies[refreshTokenCookieName] as string | undefined;
    try {
        const { refreshToken: newRefreshToken, ...result } = await authService.refresh(refreshToken);
        res.cookie(refreshTokenCookieName, newRefreshToken, refreshTokenCookieOptions);
        return sendSuccess(res, 200, result);
    } catch (error) {
        res.clearCookie(refreshTokenCookieName, refreshTokenCookieClearOptions);
        throw error;
    }
});

//[POST] /api/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies[refreshTokenCookieName] as string | undefined;
    try {
        await authService.logout(refreshToken);
    } finally {
        res.clearCookie(refreshTokenCookieName, refreshTokenCookieClearOptions);
    }
    return res.status(204).send();
});
