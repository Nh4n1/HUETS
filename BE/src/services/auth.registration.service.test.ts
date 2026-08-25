import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./mail.service.ts', () => ({
    sendRegistrationVerificationCode: vi.fn().mockResolvedValue(undefined),
}));

import User from '../models/user.model.ts';
import RegistrationVerification from '../models/registrationVerification.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { sendRegistrationVerificationCode } from './mail.service.ts';
import { resendRegistrationCode, startRegistration, verifyRegistration } from './auth.service.ts';

beforeEach(() => {
    vi.mocked(sendRegistrationVerificationCode).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('registration verification lifecycle', () => {
    it('creates a pending registration and sends mail without creating a user', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        vi.spyOn(User, 'findOne').mockResolvedValue(null);
        vi.spyOn(RegistrationVerification, 'findOne').mockResolvedValue(null);
        vi.spyOn(RegistrationVerification, 'findOneAndUpdate').mockResolvedValue({
            _id: registrationId,
        } as never);
        const createUser = vi.spyOn(User, 'create');

        const result = await startRegistration({
            displayName: 'Nguyễn Văn A',
            email: 'User@Example.com',
            password: 'Secret123!',
            confirmPassword: 'Secret123!',
        });

        expect(result).toMatchObject({
            status: 'verification_required',
            registrationId: registrationId.toString(),
            maskedEmail: 'U***@Example.com',
        });
        expect(RegistrationVerification.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ normalizedEmail: 'user@example.com' }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    passwordHash: expect.not.stringMatching(/^Secret123!$/),
                    otp: expect.stringMatching(/^\d{6}$/),
                }),
            }),
            expect.any(Object),
        );
        expect(sendRegistrationVerificationCode).toHaveBeenCalledOnce();
        expect(createUser).not.toHaveBeenCalled();
    });

    it('creates an active user only after a correct code and removes the pending record', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();
        vi.spyOn(RegistrationVerification, 'findById').mockResolvedValue({
            _id: registrationId,
            email: 'user@example.com',
            normalizedEmail: 'user@example.com',
            displayName: 'Nguyễn Văn A',
            passwordHash: 'password-hash',
            otp: '012345',
            verifyAttemptCount: 0,
            expiresAt: new Date(Date.now() + 60_000),
        } as never);
        vi.spyOn(User, 'findOne').mockResolvedValue(null);
        vi.spyOn(User, 'create').mockResolvedValue({
            _id: userId,
            email: 'user@example.com',
            displayName: 'Nguyễn Văn A',
            role: 'user',
            status: 'active',
        } as never);
        vi.spyOn(RegistrationVerification, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as never);

        const result = await verifyRegistration({
            registrationId: registrationId.toString(),
            code: '012345',
        });

        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
            passwordHash: 'password-hash',
            role: 'user',
            status: 'active',
        }));
        expect(RegistrationVerification.deleteOne).toHaveBeenCalledWith({ _id: registrationId });
        expect(result).toMatchObject({ id: userId.toString(), role: 'user', status: 'active' });
    });

    it('increments attempts for an invalid code without creating a user', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        vi.spyOn(RegistrationVerification, 'findById').mockResolvedValue({
            _id: registrationId,
            otp: '012345',
            verifyAttemptCount: 0,
            expiresAt: new Date(Date.now() + 60_000),
        } as never);
        vi.spyOn(RegistrationVerification, 'findOneAndUpdate').mockResolvedValue({
            verifyAttemptCount: 1,
        } as never);
        const createUser = vi.spyOn(User, 'create');

        await expect(verifyRegistration({
            registrationId: registrationId.toString(),
            code: '999999',
        })).rejects.toMatchObject<Partial<ApiError>>({ code: 'VERIFICATION_CODE_INVALID' });

        expect(RegistrationVerification.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ _id: registrationId }),
            { $inc: { verifyAttemptCount: 1 } },
            { new: true },
        );
        expect(createUser).not.toHaveBeenCalled();
    });

    it('blocks the fifth invalid attempt', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        vi.spyOn(RegistrationVerification, 'findById').mockResolvedValue({
            _id: registrationId,
            otp: '012345',
            verifyAttemptCount: 4,
            expiresAt: new Date(Date.now() + 60_000),
        } as never);
        vi.spyOn(RegistrationVerification, 'findOneAndUpdate').mockResolvedValue({
            verifyAttemptCount: 5,
        } as never);

        await expect(verifyRegistration({
            registrationId: registrationId.toString(),
            code: '999999',
        })).rejects.toMatchObject<Partial<ApiError>>({ code: 'VERIFICATION_ATTEMPTS_EXCEEDED' });
    });

    it('rejects an expired code before creating a user', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        vi.spyOn(RegistrationVerification, 'findById').mockResolvedValue({
            _id: registrationId,
            otp: '012345',
            verifyAttemptCount: 0,
            expiresAt: new Date(Date.now() - 1_000),
        } as never);
        const createUser = vi.spyOn(User, 'create');

        await expect(verifyRegistration({
            registrationId: registrationId.toString(),
            code: '012345',
        })).rejects.toMatchObject<Partial<ApiError>>({ code: 'VERIFICATION_CODE_EXPIRED' });
        expect(createUser).not.toHaveBeenCalled();
    });

    it('rotates the code, resets attempts, and extends expiry on resend', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        const pending = {
            _id: registrationId,
            email: 'user@example.com',
            displayName: 'Nguyễn Văn A',
            otp: '012345',
            verifyAttemptCount: 3,
            resendCount: 1,
            lastSentAt: new Date(Date.now() - 120_000),
            resendAvailableAt: new Date(Date.now() - 60_000),
            expiresAt: new Date(Date.now() + 60_000),
        };
        vi.spyOn(RegistrationVerification, 'findById').mockResolvedValue(pending as never);
        vi.spyOn(RegistrationVerification, 'findOneAndUpdate').mockImplementation(async (_filter, update) => ({
            ...pending,
            ...(update as { $set: object }).$set,
            resendCount: 2,
        }) as never);

        const result = await resendRegistrationCode({ registrationId: registrationId.toString() });
        const update = vi.mocked(RegistrationVerification.findOneAndUpdate).mock.calls[0]?.[1] as {
            $set: { otp: string; verifyAttemptCount: number; expiresAt: Date };
            $inc: { resendCount: number };
        };

        expect(update.$set.otp).toMatch(/^\d{6}$/);
        expect(update.$set.verifyAttemptCount).toBe(0);
        expect(update.$inc.resendCount).toBe(1);
        expect(update.$set.expiresAt.getTime()).toBeGreaterThan(pending.expiresAt.getTime());
        expect(sendRegistrationVerificationCode).toHaveBeenCalledWith(
            pending.email,
            pending.displayName,
            update.$set.otp,
        );
        expect(result.status).toBe('verification_code_resent');
    });

    it('removes a newly-created pending record when email delivery fails', async () => {
        const registrationId = new mongoose.Types.ObjectId();
        vi.spyOn(User, 'findOne').mockResolvedValue(null);
        vi.spyOn(RegistrationVerification, 'findOne').mockResolvedValue(null);
        vi.spyOn(RegistrationVerification, 'findOneAndUpdate').mockResolvedValue({
            _id: registrationId,
        } as never);
        const deletePending = vi.spyOn(RegistrationVerification, 'deleteOne').mockResolvedValue({
            deletedCount: 1,
        } as never);
        vi.mocked(sendRegistrationVerificationCode).mockRejectedValueOnce(new Error('SMTP unavailable'));

        await expect(startRegistration({
            displayName: 'Nguyễn Văn A',
            email: 'user@example.com',
            password: 'Secret123!',
            confirmPassword: 'Secret123!',
        })).rejects.toMatchObject<Partial<ApiError>>({ code: 'EMAIL_DELIVERY_FAILED' });

        expect(deletePending).toHaveBeenCalledWith({
            _id: registrationId,
            otp: expect.stringMatching(/^\d{6}$/),
        });
    });
});
