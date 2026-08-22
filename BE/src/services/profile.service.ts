import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_BIO_LENGTH = 500;

interface UpdateProfileInput {
    displayName?: unknown;
    bio?: unknown;
}

const toProfileResponse = (user: InstanceType<typeof User>) => ({
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    role: user.role,
    status: user.status,
});

export const getCurrentUser = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    return toProfileResponse(user);
};

export const updateCurrentUser = async (userId: string, input: UpdateProfileInput) => {
    const updates: { displayName?: string; bio?: string | null } = {};

    if (input.displayName !== undefined) {
        if (typeof input.displayName !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Tên hiển thị không hợp lệ.');
        }

        const displayName = input.displayName.trim();
        if (
            displayName.length < MIN_DISPLAY_NAME_LENGTH
            || displayName.length > MAX_DISPLAY_NAME_LENGTH
        ) {
            throw new ApiError(
                400,
                'VALIDATION_ERROR',
                `Tên hiển thị phải có từ ${MIN_DISPLAY_NAME_LENGTH} đến ${MAX_DISPLAY_NAME_LENGTH} ký tự.`,
            );
        }
        updates.displayName = displayName;
    }

    if (input.bio !== undefined) {
        if (typeof input.bio !== 'string') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Giới thiệu không hợp lệ.');
        }

        const bio = input.bio.trim();
        if (bio.length > MAX_BIO_LENGTH) {
            throw new ApiError(
                400,
                'VALIDATION_ERROR',
                `Giới thiệu không được vượt quá ${MAX_BIO_LENGTH} ký tự.`,
            );
        }
        updates.bio = bio || null;
    }

    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Không có thông tin hồ sơ cần cập nhật.');
    }

    await getCurrentUser(userId);

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true },
    );

    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    return toProfileResponse(user);
};
