import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../helpers/jwt.helper.ts';
import User from '../models/user.model.ts';
import type { UserRole } from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

declare module 'express-serve-static-core' {
    interface Request {
        user?: { id: string; role: UserRole };
    }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
    if (!token) return next(new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.'));

    let payload;
    try {
        payload = verifyAccessToken(token);
    } catch {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Access token không hợp lệ hoặc đã hết hạn.'));
    }

    const currentUser = await User.findById(payload.sub).select({ role: 1, status: 1 }).lean();
    if (!currentUser) return next(new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.'));
    if (currentUser.status === 'locked') {
        return next(new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.'));
    }

    req.user = { id: payload.sub, role: currentUser.role };
    return next();
};

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ') || header.slice('Bearer '.length).trim().length === 0) {
        return next();
    }
    return authenticate(req, res, next);
};

export const authorize = (...allowedRoles: UserRole[]) => (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.'));
    if (!allowedRoles.includes(req.user.role)) {
        return next(new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'));
    }
    return next();
};
