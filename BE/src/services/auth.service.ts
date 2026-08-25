import User from '../models/user.model.ts';
import AuthSession from '../models/authSession.model.ts';
import RegistrationVerification from '../models/registrationVerification.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { comparePassword, hashPassword, hashToken } from '../helpers/password.helper.ts';
import { generateSixDigitOtp } from '../helpers/otp.helper.ts';
import {
    durationFromNow,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from '../helpers/jwt.helper.ts';
import authConfig, { REGISTRATION_VERIFICATION } from '../config/config.auth.ts';
import {
    registerSchema,
    resendRegistrationSchema,
    verifyRegistrationSchema,
} from '../schemas/auth.schema.ts';
import { sendRegistrationVerificationCode } from './mail.service.ts';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toPublicUser = (user: InstanceType<typeof User>) => ({
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
});

const addMinutes = (date: Date, minutes: number) =>
    new Date(date.getTime() + minutes * 60_000);

const addSeconds = (date: Date, seconds: number) =>
    new Date(date.getTime() + seconds * 1_000);

const maskEmail = (email: string) => {
    const [local = '', domain = ''] = email.split('@');
    return `${local.slice(0, 1)}***@${domain}`;
};

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
    typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const parseRegisterInput = (input: unknown) => {
    const result = registerSchema.safeParse(input);
    if (result.success) return result.data;

    const issue = result.error.issues[0];
    if (issue?.path[0] === 'email') {
        throw new ApiError(400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    }
    if (issue?.path[0] === 'confirmPassword' && issue.message === 'Passwords do not match') {
        throw new ApiError(400, 'PASSWORD_CONFIRMATION_MISMATCH', 'Mật khẩu xác nhận không khớp.');
    }
    throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin đăng ký không hợp lệ.', {
        fields: result.error.flatten().fieldErrors,
    });
};

export const startRegistration = async (input: unknown) => {
    const { displayName, email, password } = parseRegisterInput(input);
    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ normalizedEmail });
    if (existing) {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng.');
    }

    const now = new Date();
    const pending = await RegistrationVerification.findOne({ normalizedEmail });
    if (pending && pending.expiresAt > now && pending.resendAvailableAt > now) {
        const retryAfterSeconds = Math.max(
            Math.ceil((pending.resendAvailableAt.getTime() - now.getTime()) / 1_000),
            1,
        );
        throw new ApiError(429, 'VERIFICATION_RESEND_TOO_SOON', 'Vui lòng chờ trước khi gửi mã mới.', {
            retryAfterSeconds,
            resendAvailableAt: pending.resendAvailableAt,
        });
    }
    if (pending && pending.expiresAt > now && pending.resendCount >= REGISTRATION_VERIFICATION.MAX_RESENDS) {
        throw new ApiError(429, 'VERIFICATION_RESEND_LIMIT_EXCEEDED', 'Đã đạt giới hạn gửi lại mã.');
    }

    const passwordHash = await hashPassword(password);
    const otp = generateSixDigitOtp();
    const expiresAt = addMinutes(now, REGISTRATION_VERIFICATION.OTP_TTL_MINUTES);
    const resendAvailableAt = addSeconds(now, REGISTRATION_VERIFICATION.RESEND_COOLDOWN_SECONDS);
    const resendCount = pending && pending.expiresAt > now ? pending.resendCount + 1 : 0;

    let registration;
    try {
        registration = await RegistrationVerification.findOneAndUpdate(
            {
                normalizedEmail,
                $or: [
                    { resendAvailableAt: { $lte: now } },
                    { expiresAt: { $lte: now } },
                ],
            },
            {
                $set: {
                    email,
                    displayName,
                    passwordHash,
                    otp,
                    verifyAttemptCount: 0,
                    resendCount,
                    lastSentAt: now,
                    resendAvailableAt,
                    expiresAt,
                },
                $setOnInsert: { normalizedEmail },
            },
            { upsert: true, new: true, runValidators: true },
        );
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            throw new ApiError(429, 'VERIFICATION_RESEND_TOO_SOON', 'Vui lòng chờ trước khi gửi mã mới.');
        }
        throw error;
    }

    try {
        await sendRegistrationVerificationCode(email, displayName, otp);
    } catch {
        if (pending) {
            await RegistrationVerification.updateOne(
                { _id: registration._id, otp },
                {
                    $set: {
                        email: pending.email,
                        displayName: pending.displayName,
                        passwordHash: pending.passwordHash,
                        otp: pending.otp,
                        verifyAttemptCount: pending.verifyAttemptCount,
                        resendCount: pending.resendCount,
                        lastSentAt: pending.lastSentAt,
                        resendAvailableAt: pending.resendAvailableAt,
                        expiresAt: pending.expiresAt,
                    },
                },
            );
        } else {
            await RegistrationVerification.deleteOne({ _id: registration._id, otp });
        }
        throw new ApiError(503, 'EMAIL_DELIVERY_FAILED', 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
    }

    return {
        status: 'verification_required',
        registrationId: registration._id.toString(),
        maskedEmail: maskEmail(email),
        expiresAt,
        resendAvailableAt,
    };
};

export const verifyRegistration = async (input: unknown) => {
    const result = verifyRegistrationSchema.safeParse(input);
    if (!result.success) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Mã xác thực hoặc phiên đăng ký không hợp lệ.');
    }

    const { registrationId, code } = result.data;
    const pending = await RegistrationVerification.findById(registrationId);
    if (!pending) {
        throw new ApiError(404, 'REGISTRATION_VERIFICATION_NOT_FOUND', 'Phiên đăng ký không còn hợp lệ.');
    }

    const now = new Date();
    if (pending.expiresAt <= now) {
        throw new ApiError(410, 'VERIFICATION_CODE_EXPIRED', 'Mã xác thực đã hết hạn.');
    }
    if (pending.verifyAttemptCount >= REGISTRATION_VERIFICATION.MAX_ATTEMPTS) {
        throw new ApiError(429, 'VERIFICATION_ATTEMPTS_EXCEEDED', 'Đã vượt quá số lần nhập mã cho phép.');
    }

    if (pending.otp !== code) {
        const updated = await RegistrationVerification.findOneAndUpdate(
            {
                _id: pending._id,
                otp: { $ne: code },
                expiresAt: { $gt: now },
                verifyAttemptCount: { $lt: REGISTRATION_VERIFICATION.MAX_ATTEMPTS },
            },
            { $inc: { verifyAttemptCount: 1 } },
            { new: true },
        );
        if (updated && updated.verifyAttemptCount >= REGISTRATION_VERIFICATION.MAX_ATTEMPTS) {
            throw new ApiError(429, 'VERIFICATION_ATTEMPTS_EXCEEDED', 'Đã vượt quá số lần nhập mã cho phép.');
        }
        throw new ApiError(400, 'VERIFICATION_CODE_INVALID', 'Mã xác thực không đúng.');
    }

    const existing = await User.findOne({ normalizedEmail: pending.normalizedEmail });
    if (existing) {
        await RegistrationVerification.deleteOne({ _id: pending._id });
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng.');
    }

    try {
        const user = await User.create({
            email: pending.email,
            normalizedEmail: pending.normalizedEmail,
            passwordHash: pending.passwordHash,
            displayName: pending.displayName,
            role: 'user',
            status: 'active',
        });
        await RegistrationVerification.deleteOne({ _id: pending._id });
        return toPublicUser(user);
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            await RegistrationVerification.deleteOne({ _id: pending._id });
            throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Tài khoản đã được tạo.');
        }
        throw error;
    }
};

export const resendRegistrationCode = async (input: unknown) => {
    const result = resendRegistrationSchema.safeParse(input);
    if (!result.success) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Phiên đăng ký không hợp lệ.');
    }

    const pending = await RegistrationVerification.findById(result.data.registrationId);
    if (!pending) {
        throw new ApiError(404, 'REGISTRATION_VERIFICATION_NOT_FOUND', 'Phiên đăng ký không còn hợp lệ.');
    }

    const now = new Date();
    if (pending.resendAvailableAt > now) {
        const retryAfterSeconds = Math.max(
            Math.ceil((pending.resendAvailableAt.getTime() - now.getTime()) / 1_000),
            1,
        );
        throw new ApiError(429, 'VERIFICATION_RESEND_TOO_SOON', 'Vui lòng chờ trước khi gửi mã mới.', {
            retryAfterSeconds,
            resendAvailableAt: pending.resendAvailableAt,
        });
    }
    if (pending.resendCount >= REGISTRATION_VERIFICATION.MAX_RESENDS) {
        throw new ApiError(429, 'VERIFICATION_RESEND_LIMIT_EXCEEDED', 'Đã đạt giới hạn gửi lại mã.');
    }

    const otp = generateSixDigitOtp();
    const expiresAt = addMinutes(now, REGISTRATION_VERIFICATION.OTP_TTL_MINUTES);
    const resendAvailableAt = addSeconds(now, REGISTRATION_VERIFICATION.RESEND_COOLDOWN_SECONDS);
    const updated = await RegistrationVerification.findOneAndUpdate(
        {
            _id: pending._id,
            resendAvailableAt: { $lte: now },
            resendCount: { $lt: REGISTRATION_VERIFICATION.MAX_RESENDS },
        },
        {
            $set: {
                otp,
                verifyAttemptCount: 0,
                lastSentAt: now,
                resendAvailableAt,
                expiresAt,
            },
            $inc: { resendCount: 1 },
        },
        { new: true },
    );
    if (!updated) {
        throw new ApiError(429, 'VERIFICATION_RESEND_TOO_SOON', 'Vui lòng chờ trước khi gửi mã mới.');
    }

    try {
        await sendRegistrationVerificationCode(updated.email, updated.displayName, otp);
    } catch {
        await RegistrationVerification.updateOne(
            { _id: updated._id, otp },
            {
                $set: {
                    otp: pending.otp,
                    verifyAttemptCount: pending.verifyAttemptCount,
                    resendCount: pending.resendCount,
                    lastSentAt: pending.lastSentAt,
                    resendAvailableAt: pending.resendAvailableAt,
                    expiresAt: pending.expiresAt,
                },
            },
        );
        throw new ApiError(503, 'EMAIL_DELIVERY_FAILED', 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
    }

    return {
        status: 'verification_code_resent',
        expiresAt,
        resendAvailableAt,
    };
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

export const refresh = async (refreshToken?: string) => {
    if (!refreshToken) {
        throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Không tìm thấy phiên đăng nhập.');
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

export const logout = async (refreshToken?: string) => {
    if (!refreshToken) return;
    await AuthSession.deleteOne({ refreshTokenHash: hashToken(refreshToken) });
};
