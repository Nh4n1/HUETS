import User from '../models/user.model.ts';
import AuthSession from '../models/authSession.model.ts';
import { comparePassword, hashPassword } from '../helpers/password.helper.ts';
import { ApiError } from '../utils/apiError.ts';

const DISPLAY_NAME_MAX_LENGTH = 100;
const BIO_MAX_LENGTH = 500;
const AVATAR_URL_MAX_LENGTH = 2048;
const PASSWORD_MIN_LENGTH = 8;

const toPublicUser = (user: InstanceType<typeof User>) => ({
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? '',
    role: user.role,
    status: user.status,
});

const getActiveUser = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    return user;
};

export const getCurrentUser = async (userId: string) => {
    const user = await getActiveUser(userId);
    return toPublicUser(user);
};

interface UpdateProfileInput {
    displayName?: unknown;
    avatarUrl?: unknown;
    bio?: unknown;
    [key: string]: unknown;
}

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
    const allowedFields = new Set(['displayName', 'avatarUrl', 'bio']);
    const unknownFields = Object.keys(input).filter((field) => !allowedFields.has(field));

    if (unknownFields.length > 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Hồ sơ chứa trường không được phép cập nhật.', {
            fields: unknownFields,
        });
    }
    if (!Object.keys(input).length) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Cần cung cấp ít nhất một thông tin để cập nhật.');
    }

    const updates: { displayName?: string; avatarUrl?: string | null; bio?: string } = {};

    if ('displayName' in input) {
        if (typeof input.displayName !== 'string' || !input.displayName.trim()) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Tên hiển thị không được để trống.');
        }
        const displayName = input.displayName.trim();
        if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
            throw new ApiError(400, 'VALIDATION_ERROR', `Tên hiển thị không được vượt quá ${DISPLAY_NAME_MAX_LENGTH} ký tự.`);
        }
        updates.displayName = displayName;
    }

    if ('avatarUrl' in input) {
        if (input.avatarUrl !== null && typeof input.avatarUrl !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Ảnh đại diện phải là URL hoặc null.');
        }
        const avatarUrl = typeof input.avatarUrl === 'string' ? input.avatarUrl.trim() : '';
        if (avatarUrl.length > AVATAR_URL_MAX_LENGTH) {
            throw new ApiError(400, 'VALIDATION_ERROR', `URL ảnh đại diện không được vượt quá ${AVATAR_URL_MAX_LENGTH} ký tự.`);
        }
        if (avatarUrl) {
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(avatarUrl);
            } catch {
                throw new ApiError(400, 'VALIDATION_ERROR', 'URL ảnh đại diện không hợp lệ.');
            }
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'URL ảnh đại diện phải sử dụng HTTP hoặc HTTPS.');
            }
            updates.avatarUrl = avatarUrl;
        } else {
            updates.avatarUrl = null;
        }
    }

    if ('bio' in input) {
        if (input.bio !== null && typeof input.bio !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Phần giới thiệu phải là chuỗi hoặc null.');
        }
        const bio = typeof input.bio === 'string' ? input.bio.trim() : '';
        if (bio.length > BIO_MAX_LENGTH) {
            throw new ApiError(400, 'VALIDATION_ERROR', `Phần giới thiệu không được vượt quá ${BIO_MAX_LENGTH} ký tự.`);
        }
        updates.bio = bio;
    }

    const user = await getActiveUser(userId);
    if ('displayName' in updates) user.displayName = updates.displayName;
    if ('avatarUrl' in updates) {
        if (updates.avatarUrl === null) user.set('avatarUrl', undefined);
        else user.avatarUrl = updates.avatarUrl;
    }
    if ('bio' in updates) user.bio = updates.bio;
    await user.save();

    return toPublicUser(user);
};

interface ChangePasswordInput {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
    const { currentPassword, newPassword, confirmPassword } = input;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu thông tin mật khẩu bắt buộc.');
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(400, 'VALIDATION_ERROR', `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`);
    }
    if (newPassword !== confirmPassword) {
        throw new ApiError(400, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    }
    if (currentPassword === newPassword) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    const user = await getActiveUser(userId);
    const currentPasswordMatches = await comparePassword(currentPassword, user.passwordHash);
    if (!currentPasswordMatches) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng.');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Revoke refresh sessions after a credential change. The current access token
    // remains usable until its short expiry, while every refresh requires login again.
    await AuthSession.deleteMany({ userId: user._id });
};
