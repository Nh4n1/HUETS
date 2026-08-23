import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../utils/apiError.ts';
import { createRateLimit } from './rateLimit.middleware.ts';

describe('createRateLimit', () => {
    it('rejects requests over the limit and returns retry headers', () => {
        const middleware = createRateLimit({ windowMs: 60_000, maxRequests: 2 });
        const request = { ip: '127.0.0.1', socket: {} } as Request;
        const response = { setHeader: vi.fn() } as unknown as Response;
        const next = vi.fn() as NextFunction;

        middleware(request, response, next);
        middleware(request, response, next);
        middleware(request, response, next);

        expect(next).toHaveBeenCalledTimes(3);
        expect(next.mock.calls[0]?.[0]).toBeUndefined();
        expect(next.mock.calls[1]?.[0]).toBeUndefined();
        expect(next.mock.calls[2]?.[0]).toMatchObject<ApiError>({
            statusCode: 429,
            code: 'RATE_LIMITED',
        });
        expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('supports a custom key so authenticated users have independent limits', () => {
        const middleware = createRateLimit({
            windowMs: 60_000,
            maxRequests: 1,
            keyGenerator: (request) => request.user?.id,
        });
        const response = { setHeader: vi.fn() } as unknown as Response;
        const next = vi.fn() as NextFunction;

        middleware({ user: { id: 'user-1', role: 'user' }, socket: {} } as Request, response, next);
        middleware({ user: { id: 'user-2', role: 'user' }, socket: {} } as Request, response, next);
        middleware({ user: { id: 'user-1', role: 'user' }, socket: {} } as Request, response, next);

        expect(next.mock.calls[0]?.[0]).toBeUndefined();
        expect(next.mock.calls[1]?.[0]).toBeUndefined();
        expect(next.mock.calls[2]?.[0]).toMatchObject<ApiError>({
            statusCode: 429,
            code: 'RATE_LIMITED',
        });
    });
});
