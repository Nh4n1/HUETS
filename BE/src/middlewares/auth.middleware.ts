import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../helpers/jwt.helper.ts';
import { ApiError } from '../utils/apiError.ts';

declare module 'express-serve-static-core' {
    interface Request {
        user?: { id: string; role: 'user' | 'admin' };
    }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;

    if (!token) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.'));
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role };
        return next();
    } catch {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Access token không hợp lệ hoặc đã hết hạn.'));
    }
};

export const authorize = (...allowedRoles: Array<'user' | 'admin'>) => (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    if (!req.user) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
        return next(new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'));
    }
    return next();
};
