import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

export const getCurrentUser = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    return {
        id: user._id.toString(),
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        status: user.status,
    };
};
