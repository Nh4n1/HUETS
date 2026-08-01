import User from '../models/user.model.ts';
import AuthSession from '../models/authSession.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { comparePassword, hashPassword, hashToken } from '../helpers/password.helper.ts';
import {
    durationFromNow,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from '../helpers/jwt.helper.ts';
import authConfig from '../config/config.auth.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toPublicUser = (user: InstanceType<typeof User>) => ({
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
});

interface RegisterInput {
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export const register = async (input: RegisterInput) => {
    const { displayName, email, password, confirmPassword } = input;

    if (!displayName || !email || !password || !confirmPassword) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu thông tin bắt buộc.');
    }
    if (!EMAIL_REGEX.test(email)) {
        throw new ApiError(400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    }
    if (password !== confirmPassword) {
        throw new ApiError(400, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ normalizedEmail });
    if (existing) {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng.');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
        email: email.trim(),
        normalizedEmail,
        passwordHash,
        displayName: displayName.trim(),
    });

    return toPublicUser(user);
};

interface LoginInput {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
}

export const login = async (input: LoginInput) => {
    const { email, password, userAgent, ipAddress } = input;

    if (!email || !password) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu thông tin bắt buộc.');
    }

    const user = await User.findOne({ normalizedEmail: normalizeEmail(email) });
    if (!user) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    }

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString() });

    await AuthSession.create({
        userId: user._id,
        refreshTokenHash: hashToken(refreshToken),
        ...(userAgent !== undefined ? { userAgent } : {}),
        ...(ipAddress !== undefined ? { ipAddress } : {}),
        expiresAt: durationFromNow(authConfig.refreshTokenExpiresIn),
    });

    return { accessToken, refreshToken, user: toPublicUser(user) };
};

export const refresh = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu refresh token.');
    }

    let payload: { sub: string };
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch {
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    const session = await AuthSession.findOne({
        userId: payload.sub,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: { $gt: new Date() },
    });
    if (!session) {
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.status === 'locked') {
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const newRefreshToken = signRefreshToken({ sub: user._id.toString() });

    session.refreshTokenHash = hashToken(newRefreshToken);
    session.expiresAt = durationFromNow(authConfig.refreshTokenExpiresIn);
    await session.save();

    return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (refreshToken: string) => {
    if (!refreshToken) return;
    await AuthSession.deleteOne({ refreshTokenHash: hashToken(refreshToken) });
};
