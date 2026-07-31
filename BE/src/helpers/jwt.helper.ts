import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import authConfig from '../config/config.auth.ts';

export interface AccessTokenPayload {
    sub: string;
    role: 'user' | 'admin';
}

export const signAccessToken = (payload: AccessTokenPayload) =>
    jwt.sign(payload, authConfig.accessTokenSecret, {
        expiresIn: authConfig.accessTokenExpiresIn,
    } as SignOptions);

export const signRefreshToken = (payload: { sub: string }) =>
    jwt.sign(payload, authConfig.refreshTokenSecret, {
        expiresIn: authConfig.refreshTokenExpiresIn,
    } as SignOptions);

export const verifyAccessToken = (token: string) =>
    jwt.verify(token, authConfig.accessTokenSecret) as AccessTokenPayload & jwt.JwtPayload;

export const verifyRefreshToken = (token: string) =>
    jwt.verify(token, authConfig.refreshTokenSecret) as { sub: string } & jwt.JwtPayload;

const DURATION_UNIT_MS: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
};

// converts jwt-style durations like "15m" / "7d" into an absolute expiry Date
export const durationFromNow = (duration: string): Date => {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }
    const [, amount, unit] = match;
    const unitMs = DURATION_UNIT_MS[unit as string];
    if (!amount || !unitMs) {
        throw new Error(`Invalid duration format: ${duration}`);
    }
    return new Date(Date.now() + Number(amount) * unitMs);
};
