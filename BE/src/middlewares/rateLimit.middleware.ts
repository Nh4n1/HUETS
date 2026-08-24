import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError.ts';

interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string | undefined;
    skip?: (req: Request) => boolean;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export const createRateLimit = ({ windowMs, maxRequests, keyGenerator, skip }: RateLimitOptions) => {
    const clients = new Map<string, RateLimitEntry>();

    return (req: Request, res: Response, next: NextFunction) => {
        if (skip?.(req)) return next();
        const now = Date.now();
        const key = keyGenerator?.(req) || req.ip || req.socket.remoteAddress || 'unknown';
        const current = clients.get(key);
        const entry = !current || current.resetAt <= now
            ? { count: 0, resetAt: now + windowMs }
            : current;
        entry.count += 1;
        clients.set(key, entry);

        if (clients.size > 10_000) {
            for (const [clientKey, value] of clients) {
                if (value.resetAt <= now) clients.delete(clientKey);
            }
        }

        const remaining = Math.max(maxRequests - entry.count, 0);
        res.setHeader('X-RateLimit-Limit', String(maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > maxRequests) {
            const retryAfterSeconds = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return next(new ApiError(
                429,
                'RATE_LIMITED',
                'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
                { retryAfterSeconds },
            ));
        }

        return next();
    };
};
