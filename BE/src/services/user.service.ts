import mongoose from 'mongoose';
import AuthSession from '../models/authSession.model.ts';
import User from '../models/user.model.ts';
import type { IUser, UserRole, UserStatus } from '../models/user.model.ts';
import { hashPassword } from '../helpers/password.helper.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor {
    id: string;
    role: UserRole;
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

export interface CreateManagedUserInput {
    displayName?: unknown;
    email?: unknown;
    temporaryPassword?: unknown;
    role?: unknown;
}

export interface ChangeUserRoleInput {
    role?: unknown;
}

const USER_ROLES: UserRole[] = ['user', 'mod', 'admin'];
const MANAGEABLE_ROLES: UserRole[] = ['user', 'mod'];
const USER_STATUSES: UserStatus[] = ['active', 'locked'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
const normalizeEmail = (email: string) => email.trim().toLowerCase();

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
        if (q.length > 200) throw new ApiError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm quá dài.');
        if (q.length > 0) {
            const pattern = new RegExp(escapeRegularExpression(q), 'i');
            filter.$or = [{ displayName: pattern }, { email: pattern }];
        }
    }
    if (query.role) {
        const role = query.role.trim().toLowerCase() as UserRole;
        if (!USER_ROLES.includes(role)) throw new ApiError(400, 'VALIDATION_ERROR', 'Vai trò không hợp lệ.');
        filter.role = role;
    }
    if (query.status) {
        const status = query.status.trim().toLowerCase() as UserStatus;
        if (!USER_STATUSES.includes(status)) throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái không hợp lệ.');
        filter.status = status;
    }
    return filter;
};

const assertActiveAdmin = async (actor: Actor) => {
    if (!mongoose.isValidObjectId(actor.id)) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
    const admin = await User.findById(actor.id).select({ role: 1, status: 1 });
    if (!admin) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    if (admin.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    if (admin.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền quản lý người dùng.');
};

const findManageableUser = async (userId: string, actor: Actor) => {
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    if (userId === actor.id) throw new ApiError(400, 'CANNOT_MANAGE_SELF', 'Bạn không thể thực hiện thao tác này với chính mình.');
    await assertActiveAdmin(actor);
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    if (user.role === 'admin') throw new ApiError(403, 'CANNOT_MANAGE_ADMIN', 'Không thể thay đổi tài khoản quản trị viên.');
    return user;
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
        meta: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    };
};

export const getAdminUserById = async (userId: string) => {
    if (!mongoose.isValidObjectId(userId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy người dùng.');
    return toAdminUserSummary(user);
};

export const getAdminUserStats = async () => {
    const [total, active, locked, moderators] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'locked' }),
        User.countDocuments({ role: 'mod' }),
    ]);
    return { total, active, locked, moderators };
};

export const createManagedUser = async (input: CreateManagedUserInput, actor: Actor) => {
    await assertActiveAdmin(actor);
    if (typeof input.displayName !== 'string' || input.displayName.trim().length < 2 || input.displayName.trim().length > 80) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Tên hiển thị phải có từ 2 đến 80 ký tự.');
    }
    if (typeof input.email !== 'string' || !EMAIL_REGEX.test(input.email.trim())) {
        throw new ApiError(400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    }
    if (typeof input.temporaryPassword !== 'string' || input.temporaryPassword.length < 8 || input.temporaryPassword.length > 72) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Mật khẩu ban đầu phải có từ 8 đến 72 ký tự.');
    }
    if (typeof input.role !== 'string' || !MANAGEABLE_ROLES.includes(input.role as UserRole)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Chỉ có thể tạo tài khoản người dùng hoặc kiểm duyệt viên.');
    }
    const normalizedEmail = normalizeEmail(input.email);
    if (await User.exists({ normalizedEmail })) throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng.');
    const user = await User.create({
        email: input.email.trim(),
        normalizedEmail,
        passwordHash: await hashPassword(input.temporaryPassword),
        displayName: input.displayName.trim(),
        role: input.role as UserRole,
    });
    return toAdminUserSummary(user);
};

export const changeUserRole = async (userId: string, input: ChangeUserRoleInput, actor: Actor) => {
    if (typeof input.role !== 'string' || !MANAGEABLE_ROLES.includes(input.role as UserRole)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Vai trò mới phải là người dùng hoặc kiểm duyệt viên.');
    }
    const user = await findManageableUser(userId, actor);
    user.role = input.role as UserRole;
    await user.save();
    await AuthSession.deleteMany({ userId: user._id });
    return toAdminUserSummary(user);
};

export const lockUser = async (userId: string, input: LockUserInput, actor: Actor) => {
    const user = await findManageableUser(userId, actor);
    if (typeof input.reason !== 'string' || input.reason.trim().length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập lý do khóa tài khoản.');
    }
    const reason = input.reason.trim();
    if (reason.length > MAX_LOCK_REASON_LENGTH) {
        throw new ApiError(400, 'VALIDATION_ERROR', `Lý do khóa không được vượt quá ${MAX_LOCK_REASON_LENGTH} ký tự.`);
    }
    user.status = 'locked';
    user.lockReason = reason;
    await user.save();
    await AuthSession.deleteMany({ userId: user._id });
    return toAdminUserSummary(user);
};

export const unlockUser = async (userId: string, actor: Actor) => {
    const user = await findManageableUser(userId, actor);
    user.status = 'active';
    user.lockReason = null;
    await user.save();
    return toAdminUserSummary(user);
};

export const revokeUserSessions = async (userId: string, actor: Actor) => {
    const user = await findManageableUser(userId, actor);
    const result = await AuthSession.deleteMany({ userId: user._id });
    return { userId: user._id.toString(), revokedSessions: result.deletedCount };
};
