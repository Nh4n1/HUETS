import User from '../models/user.model.ts';
import AuthSession from '../models/authSession.model.ts';
import PasswordResetToken from '../models/passwordResetToken.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { hashPassword, comparePassword, hashToken, generateOpaqueToken } from '../helpers/password.helper.ts';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    durationFromNow,
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
        email,
        normalizedEmail,
        passwordHash,
        displayName,
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

    const tokenHash = hashToken(refreshToken);
    const session = await AuthSession.findOne({ userId: payload.sub, refreshTokenHash: tokenHash });
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

export const forgotPassword = async (email: string) => {
    if (!email) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu email.');
    }

    const user = await User.findOne({ normalizedEmail: normalizeEmail(email) });
    // always resolve neutrally to avoid account enumeration
    if (!user) {
        return;
    }

    const rawToken = generateOpaqueToken();
    await PasswordResetToken.create({
        userId: user._id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + authConfig.passwordResetTokenExpiresInMs),
    });

    // TODO: send rawToken to user via email once mailer service exists
};

interface ResetPasswordInput {
    token: string;
    newPassword: string;
    confirmPassword: string;
}

export const resetPassword = async (input: ResetPasswordInput) => {
    const { token, newPassword, confirmPassword } = input;

    if (!token || !newPassword || !confirmPassword) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu thông tin bắt buộc.');
    }
    if (newPassword !== confirmPassword) {
        throw new ApiError(400, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    }

    const resetToken = await PasswordResetToken.findOne({
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { $gt: new Date() },
    });
    if (!resetToken) {
        throw new ApiError(400, 'INVALID_RESET_TOKEN', 'Token không hợp lệ hoặc đã hết hạn.');
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
        throw new ApiError(400, 'INVALID_RESET_TOKEN', 'Token không hợp lệ hoặc đã hết hạn.');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    resetToken.usedAt = new Date();
    await resetToken.save();

    await AuthSession.deleteMany({ userId: user._id });
};
