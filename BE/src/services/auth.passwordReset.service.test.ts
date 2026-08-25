import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./mail.service.ts', () => ({
    sendRegistrationVerificationCode: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetCode: vi.fn().mockResolvedValue(undefined),
}));

import User from '../models/user.model.ts';
import AuthSession from '../models/authSession.model.ts';
import PasswordResetVerification from '../models/passwordResetVerification.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { sendPasswordResetCode } from './mail.service.ts';
import {
    requestPasswordReset,
    resendPasswordResetCode,
    resetPassword,
} from './auth.service.ts';

const userId = new mongoose.Types.ObjectId();
const verificationId = new mongoose.Types.ObjectId();

const user = {
    _id: userId,
    email: 'User@Example.com',
    normalizedEmail: 'user@example.com',
    displayName: 'Nguyễn Văn A',
    passwordHash: 'old-password-hash',
    role: 'user',
    status: 'active',
};

beforeEach(() => {
    vi.mocked(sendPasswordResetCode).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('password reset lifecycle', () => {
    it('creates a reset verification and emails a six-digit code', async () => {
        vi.spyOn(User, 'findOne').mockResolvedValue(user as never);
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue(null);
        vi.spyOn(PasswordResetVerification, 'findOneAndUpdate').mockResolvedValue({
            _id: verificationId,
        } as never);

        const result = await requestPasswordReset({ email: ' User@Example.com ' });
        const update = vi.mocked(PasswordResetVerification.findOneAndUpdate).mock.calls[0]?.[1] as {
            $set: { otp: string; verifyAttemptCount: number };
        };

        expect(update.$set.otp).toMatch(/^\d{6}$/);
        expect(update.$set.verifyAttemptCount).toBe(0);
        expect(sendPasswordResetCode).toHaveBeenCalledWith(user.email, user.displayName, update.$set.otp);
        expect(result).toMatchObject({
            status: 'password_reset_code_sent',
            maskedEmail: 'U***@Example.com',
        });
    });

    it('returns a neutral response and creates no record for an unknown email', async () => {
        vi.spyOn(User, 'findOne').mockResolvedValue(null);
        const upsert = vi.spyOn(PasswordResetVerification, 'findOneAndUpdate');

        const result = await requestPasswordReset({ email: 'missing@example.com' });

        expect(result.status).toBe('password_reset_code_sent');
        expect(result.maskedEmail).toBe('m***@example.com');
        expect(upsert).not.toHaveBeenCalled();
        expect(sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it('does not send duplicate mail during the cooldown', async () => {
        const pending = {
            expiresAt: new Date(Date.now() + 300_000),
            resendAvailableAt: new Date(Date.now() + 30_000),
            resendCount: 0,
        };
        vi.spyOn(User, 'findOne').mockResolvedValue(user as never);
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue(pending as never);

        const result = await requestPasswordReset({ email: user.email });

        expect(result.resendAvailableAt).toBe(pending.resendAvailableAt);
        expect(sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it('deletes a new verification when mail delivery fails', async () => {
        vi.spyOn(User, 'findOne').mockResolvedValue(user as never);
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue(null);
        vi.spyOn(PasswordResetVerification, 'findOneAndUpdate').mockResolvedValue({
            _id: verificationId,
        } as never);
        const deletePending = vi.spyOn(PasswordResetVerification, 'deleteOne').mockResolvedValue({
            deletedCount: 1,
        } as never);
        vi.mocked(sendPasswordResetCode).mockRejectedValueOnce(new Error('SMTP unavailable'));

        await expect(requestPasswordReset({ email: user.email }))
            .rejects.toMatchObject<Partial<ApiError>>({ code: 'EMAIL_DELIVERY_FAILED' });
        expect(deletePending).toHaveBeenCalledWith({
            _id: verificationId,
            otp: expect.stringMatching(/^\d{6}$/),
        });
    });

    it('rotates the OTP and resets attempts on resend', async () => {
        const pending = {
            _id: verificationId,
            userId,
            email: user.email,
            otp: '012345',
            verifyAttemptCount: 3,
            resendCount: 1,
            lastSentAt: new Date(Date.now() - 120_000),
            resendAvailableAt: new Date(Date.now() - 60_000),
            expiresAt: new Date(Date.now() + 60_000),
        };
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue(pending as never);
        vi.spyOn(User, 'findById').mockResolvedValue(user as never);
        vi.spyOn(PasswordResetVerification, 'findOneAndUpdate').mockImplementation(async (_filter, update) => ({
            ...pending,
            ...(update as { $set: object }).$set,
            resendCount: 2,
        }) as never);

        await resendPasswordResetCode({ email: user.email });
        const update = vi.mocked(PasswordResetVerification.findOneAndUpdate).mock.calls[0]?.[1] as {
            $set: { otp: string; verifyAttemptCount: number };
            $inc: { resendCount: number };
        };

        expect(update.$set.otp).toMatch(/^\d{6}$/);
        expect(update.$set.verifyAttemptCount).toBe(0);
        expect(update.$inc.resendCount).toBe(1);
        expect(sendPasswordResetCode).toHaveBeenCalledWith(user.email, user.displayName, update.$set.otp);
    });

    it('atomically consumes a correct OTP, hashes the password, and revokes sessions', async () => {
        const pending = {
            _id: verificationId,
            userId,
            otp: '012345',
            verifyAttemptCount: 0,
            expiresAt: new Date(Date.now() + 60_000),
        };
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue(pending as never);
        vi.spyOn(User, 'findById').mockResolvedValue(user as never);
        vi.spyOn(PasswordResetVerification, 'findOneAndDelete').mockResolvedValue(pending as never);
        const updateUser = vi.spyOn(User, 'updateOne').mockResolvedValue({ matchedCount: 1 } as never);
        const revokeSessions = vi.spyOn(AuthSession, 'deleteMany').mockResolvedValue({ deletedCount: 2 } as never);

        const result = await resetPassword({
            email: user.email,
            code: '012345',
            newPassword: 'NewSecret123!',
            confirmPassword: 'NewSecret123!',
        });
        const passwordHash = (updateUser.mock.calls[0]?.[1] as { $set: { passwordHash: string } }).$set.passwordHash;

        expect(passwordHash).not.toBe('NewSecret123!');
        expect(passwordHash).toMatch(/^\$2/);
        expect(PasswordResetVerification.findOneAndDelete).toHaveBeenCalledWith(expect.objectContaining({
            _id: verificationId,
            otp: '012345',
        }));
        expect(revokeSessions).toHaveBeenCalledWith({ userId });
        expect(result).toEqual({ status: 'password_reset_success' });
    });

    it('increments wrong attempts without changing the password', async () => {
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue({
            _id: verificationId,
            otp: '012345',
            verifyAttemptCount: 0,
            expiresAt: new Date(Date.now() + 60_000),
        } as never);
        vi.spyOn(PasswordResetVerification, 'findOneAndUpdate').mockResolvedValue({
            verifyAttemptCount: 1,
        } as never);
        const updateUser = vi.spyOn(User, 'updateOne');

        await expect(resetPassword({
            email: user.email,
            code: '999999',
            newPassword: 'NewSecret123!',
            confirmPassword: 'NewSecret123!',
        })).rejects.toMatchObject<Partial<ApiError>>({ code: 'PASSWORD_RESET_CODE_INVALID' });
        expect(updateUser).not.toHaveBeenCalled();
    });

    it('rejects an expired or already-consumed OTP', async () => {
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue({
            expiresAt: new Date(Date.now() - 1_000),
        } as never);

        await expect(resetPassword({
            email: user.email,
            code: '012345',
            newPassword: 'NewSecret123!',
            confirmPassword: 'NewSecret123!',
        })).rejects.toMatchObject<Partial<ApiError>>({ code: 'PASSWORD_RESET_CODE_INVALID_OR_EXPIRED' });
    });

    it('allows only one concurrent request to consume an OTP', async () => {
        const pending = {
            _id: verificationId,
            userId,
            otp: '012345',
            verifyAttemptCount: 0,
            expiresAt: new Date(Date.now() + 60_000),
        };
        vi.spyOn(PasswordResetVerification, 'findOne').mockResolvedValue(pending as never);
        vi.spyOn(User, 'findById').mockResolvedValue(user as never);
        vi.spyOn(PasswordResetVerification, 'findOneAndDelete')
            .mockResolvedValueOnce(pending as never)
            .mockResolvedValueOnce(null);
        vi.spyOn(User, 'updateOne').mockResolvedValue({ matchedCount: 1 } as never);
        vi.spyOn(AuthSession, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as never);
        const payload = {
            email: user.email,
            code: '012345',
            newPassword: 'NewSecret123!',
            confirmPassword: 'NewSecret123!',
        };

        const results = await Promise.allSettled([resetPassword(payload), resetPassword(payload)]);

        expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
        expect(User.updateOne).toHaveBeenCalledOnce();
    });
});
