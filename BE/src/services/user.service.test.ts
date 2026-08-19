import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { getAdminUsers, lockUser, unlockUser } from './user.service.ts';

const adminId = new mongoose.Types.ObjectId();
const targetUserId = new mongoose.Types.ObjectId();

const mockActiveAdmin = () => {
    vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: adminId, role: 'admin', status: 'active' }),
    } as never);
};

describe('user.service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getAdminUsers', () => {
        it('paginates and returns sanitized user summaries', async () => {
            const users = [
                {
                    _id: targetUserId,
                    email: 'user@example.com',
                    displayName: 'Nguyễn Văn A',
                    avatarUrl: null,
                    role: 'user',
                    status: 'active',
                    lockReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            const findSpy = vi.spyOn(User, 'find').mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue(users),
            } as never);
            vi.spyOn(User, 'countDocuments').mockResolvedValue(1 as never);

            const result = await getAdminUsers({});

            expect(findSpy).toHaveBeenCalledWith({});
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).not.toHaveProperty('passwordHash');
            expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 1, totalPages: 1 });
        });

        it('builds a case-insensitive $or filter on email and displayName for q', async () => {
            const findSpy = vi.spyOn(User, 'find').mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([]),
            } as never);
            vi.spyOn(User, 'countDocuments').mockResolvedValue(0 as never);

            await getAdminUsers({ q: 'an' });

            expect(findSpy).toHaveBeenCalledWith({
                $or: [{ displayName: expect.any(RegExp) }, { email: expect.any(RegExp) }],
            });
        });

        it('rejects an invalid status filter', async () => {
            await expect(getAdminUsers({ status: 'banned' })).rejects.toThrow(ApiError);
        });

        it('rejects an invalid role filter', async () => {
            await expect(getAdminUsers({ role: 'superadmin' })).rejects.toThrow(ApiError);
        });
    });

    describe('lockUser', () => {
        it('locks a user and stores a trimmed reason', async () => {
            mockActiveAdmin();
            const updated = {
                _id: targetUserId,
                email: 'user@example.com',
                displayName: 'Nguyễn Văn A',
                role: 'user',
                status: 'locked',
                lockReason: 'Vi phạm quy định',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const updateSpy = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updated as never);

            const result = await lockUser(
                targetUserId.toString(),
                { reason: '  Vi phạm quy định  ' },
                { id: adminId.toString(), role: 'admin' },
            );

            expect(updateSpy).toHaveBeenCalledWith(
                targetUserId.toString(),
                { $set: { status: 'locked', lockReason: 'Vi phạm quy định' } },
                { new: true, runValidators: true },
            );
            expect(result.status).toBe('locked');
            expect(result.lockReason).toBe('Vi phạm quy định');
        });

        it('rejects locking your own account', async () => {
            await expect(
                lockUser(adminId.toString(), {}, { id: adminId.toString(), role: 'admin' }),
            ).rejects.toThrow(ApiError);
        });

        it('rejects when the acting user is not an active admin', async () => {
            vi.spyOn(User, 'findById').mockReturnValue({
                select: vi.fn().mockResolvedValue({ _id: adminId, role: 'user', status: 'active' }),
            } as never);

            await expect(
                lockUser(targetUserId.toString(), {}, { id: adminId.toString(), role: 'admin' }),
            ).rejects.toThrow(ApiError);
        });
    });

    describe('unlockUser', () => {
        it('unlocks a user and clears the lock reason', async () => {
            mockActiveAdmin();
            const updated = {
                _id: targetUserId,
                email: 'user@example.com',
                displayName: 'Nguyễn Văn A',
                role: 'user',
                status: 'active',
                lockReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const updateSpy = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(updated as never);

            const result = await unlockUser(targetUserId.toString(), { id: adminId.toString(), role: 'admin' });

            expect(updateSpy).toHaveBeenCalledWith(
                targetUserId.toString(),
                { $set: { status: 'active', lockReason: null } },
                { new: true, runValidators: true },
            );
            expect(result.status).toBe('active');
            expect(result.lockReason).toBeNull();
        });
    });
});