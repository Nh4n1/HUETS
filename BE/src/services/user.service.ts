import mongoose from 'mongoose';
import User from '../models/user.model.ts';
import type { IUser, UserRole, UserStatus } from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor {
    id: string;
    role: 'user' | 'admin';
}

export interface AdminUserQuery {
    page?: string;
    pageSize?: string;
    q?: string;
    role?: string;
    status?: string;
}

export interface LockUserInput {
    reason?: unknown;
}

const USER_ROLES: UserRole[] = ['user', 'admin'];
const USER_STATUSES: UserStatus[] = ['active', 'locked'];
const MAX_LOCK_REASON_LENGTH = 500;

const positiveInteger = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin phân trang không hợp lệ.');
    }
    return maximum ? Math.min(number, maximum) : number;
};

const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toAdminUserSummary = (user: IUser) => ({
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    status: user.status,
    lockReason: user.lockReason ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const buildAdminUserFilter = (query: AdminUserQuery): Record<string, unknown> => {
    const filter: Record<string, unknown> = {};

    if (query.q !== undefined) {
        const q = query.q.trim();
        if (q.length > 200) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Từ khoá tìm kiếm quá dài.');
        }
        if (q.length > 0) {
            const pattern = new RegExp(escapeRegularExpression(q), 'i');
            filter.$or = [{ displayName: pattern }, { email: pattern }];
        }
    }

    if (query.role) {
        const role = query.role.trim().toLowerCase() as UserRole;
        if (!USER_ROLES.includes(role)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Vai trò không hợp lệ.');
        }
        filter.role = role;
    }

    if (query.status) {
        const status = query.status.trim().toLowerCase() as UserStatus;
        if (!USER_STATUSES.includes(status)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái không hợp lệ.');
        }
        filter.status = status;
    }

    return filter;
};

export const getAdminUsers = async (query: AdminUserQuery) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 12, 100);
    const filter = buildAdminUserFilter(query);

    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        User.countDocuments(filter),
    ]);

    return {
        data: users.map(toAdminUserSummary),
        meta: {
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
    };
};

const assertActiveAdmin = async (actor: Actor) => {
    if (!mongoose.isValidObjectId(actor.id)) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
    }
    const admin = await User.findById(actor.id).select({ role: 1, status: 1 });
    if (!admin) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (admin.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }
    if (admin.role !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền quản lý người dùng.');
    }
    return admin;
};

export const lockUser = async (userId: string, input: LockUserInput, actor: Actor) => {
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    }
    if (userId === actor.id) {
        throw new ApiError(400, 'CANNOT_LOCK_SELF', 'Bạn không thể tự khóa tài khoản của chính mình.');
    }

    await assertActiveAdmin(actor);

    let reason: string | null = null;
    if (input.reason !== undefined && input.reason !== null) {
        if (typeof input.reason !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Lý do khóa không hợp lệ.');
        }
        const trimmed = input.reason.trim();
        if (trimmed.length > MAX_LOCK_REASON_LENGTH) {
            throw new ApiError(400, 'VALIDATION_ERROR', `Lý do khóa không được vượt quá ${MAX_LOCK_REASON_LENGTH} ký tự.`);
        }
        reason = trimmed.length > 0 ? trimmed : null;
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { status: 'locked', lockReason: reason } },
        { new: true, runValidators: true },
    );
    if (!user) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    }
    return toAdminUserSummary(user);
};

export const unlockUser = async (userId: string, actor: Actor) => {
    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    }

    await assertActiveAdmin(actor);

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: { status: 'active', lockReason: null } },
        { new: true, runValidators: true },
    );
    if (!user) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    }
    return toAdminUserSummary(user);
};