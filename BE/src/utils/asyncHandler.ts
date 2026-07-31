import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// wraps async controllers so rejected promises reach the error-handling middleware
export const asyncHandler = (handler: AsyncRouteHandler) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};
