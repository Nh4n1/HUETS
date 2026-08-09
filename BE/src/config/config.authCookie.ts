import type { CookieOptions } from 'express';
import authConfig from './config.auth.ts';
import { durationToMilliseconds } from '../helpers/jwt.helper.ts';

const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

export const refreshTokenCookieName = 'huetripRefreshToken';

export const refreshTokenCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: durationToMilliseconds(authConfig.refreshTokenExpiresIn),
};

export const refreshTokenCookieClearOptions: CookieOptions = {
    httpOnly: refreshTokenCookieOptions.httpOnly,
    secure: refreshTokenCookieOptions.secure,
    sameSite: refreshTokenCookieOptions.sameSite,
    path: refreshTokenCookieOptions.path,
};
