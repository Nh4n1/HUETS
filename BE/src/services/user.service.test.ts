import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthSession from '../models/authSession.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import {
    changeUserRole,
    createManagedUser,
    getAdminUsers,
    lockUser,
    revokeUserSessions,
    unlockUser,
} from './user.service.ts';

const adminId = new mongoose.Types.ObjectId();
const targetUserId = new mongoose.Types.ObjectId();
const actor = { id: adminId.toString(), role: 'admin' as const };

const activeAdminQuery = () => ({
    select: vi.fn().mockResolvedValue({ _id: adminId, role: 'admin', status: 'active' }),
});

const userDocument = (overrides: Record<string, unknown> = {}) => ({
    _id: targetUserId,
    email: 'user@example.com',
    displayName: 'Nguyễn Văn A',
    avatarUrl: null,
    role: 'user',
    status: 'active',
    lockReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

const mockActorAndTarget = (target: ReturnType<typeof userDocument>) => {
    vi.spyOn(User, 'findById')
        .mockReturnValueOnce(activeAdminQuery() as never)
        .mockResolvedValueOnce(target as never);
};

describe('user.service', () => {
    afterEach(() => vi.restoreAllMocks());

    describe('getAdminUsers', () => {
        it('paginates and returns sanitized summaries', async () => {
            const findSpy = vi.spyOn(User, 'find').mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([userDocument()]),
            } as never);
            vi.spyOn(User, 'countDocuments').mockResolvedValue(1 as never);

            const result = await getAdminUsers({});

            expect(findSpy).toHaveBeenCalledWith({});
            expect(result.data[0]).not.toHaveProperty('passwordHash');
            expect(result.meta).toEqual({ page: 1, pageSize: 12, total: 1, totalPages: 1 });
        });

        it('supports the moderator role filter', async () => {
            const findSpy = vi.spyOn(User, 'find').mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([]),
            } as never);
            vi.spyOn(User, 'countDocuments').mockResolvedValue(0 as never);

            await getAdminUsers({ role: 'mod' });
            expect(findSpy).toHaveBeenCalledWith({ role: 'mod' });
        });

        it('rejects invalid role and status filters', async () => {
            await expect(getAdminUsers({ role: 'superadmin' })).rejects.toThrow(ApiError);
            await expect(getAdminUsers({ status: 'banned' })).rejects.toThrow(ApiError);
        });
    });

    describe('managed accounts', () => {
        it('creates a moderator account with a hashed password', async () => {
            vi.spyOn(User, 'findById').mockReturnValueOnce(activeAdminQuery() as never);
            vi.spyOn(User, 'exists').mockResolvedValue(null);
            const createSpy = vi.spyOn(User, 'create').mockImplementation(async (data) => userDocument({
                ...(data as object),
                role: 'mod',
            }) as never);

            const result = await createManagedUser({
                displayName: 'Moderator',
                email: 'MOD@example.com',
                temporaryPassword: 'Password123',
                role: 'mod',
            }, actor);

            expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
                normalizedEmail: 'mod@example.com',
                role: 'mod',
                passwordHash: expect.any(String),
            }));
            expect(result.role).toBe('mod');
        });

        it('does not allow creating an admin account', async () => {
            vi.spyOn(User, 'findById').mockReturnValueOnce(activeAdminQuery() as never);
            await expect(createManagedUser({
                displayName: 'Admin mới',
                email: 'admin@example.com',
                temporaryPassword: 'Password123',
                role: 'admin',
            }, actor)).rejects.toThrow(ApiError);
        });

        it('changes user to moderator and revokes sessions', async () => {
            const target = userDocument();
            mockActorAndTarget(target);
            const deleteSpy = vi.spyOn(AuthSession, 'deleteMany').mockResolvedValue({ deletedCount: 2 } as never);

            const result = await changeUserRole(targetUserId.toString(), { role: 'mod' }, actor);

            expect(target.save).toHaveBeenCalled();
            expect(deleteSpy).toHaveBeenCalledWith({ userId: targetUserId });
            expect(result.role).toBe('mod');
        });

        it('does not allow managing an admin account', async () => {
            mockActorAndTarget(userDocument({ role: 'admin' }));
            await expect(changeUserRole(targetUserId.toString(), { role: 'user' }, actor)).rejects.toMatchObject({
                code: 'CANNOT_MANAGE_ADMIN',
            });
        });
    });

    describe('account access', () => {
        it('locks a user, requires a reason and revokes sessions', async () => {
            const target = userDocument();
            mockActorAndTarget(target);
            vi.spyOn(AuthSession, 'deleteMany').mockResolvedValue({ deletedCount: 1 } as never);

            const result = await lockUser(targetUserId.toString(), { reason: '  Vi phạm quy định  ' }, actor);

            expect(target.save).toHaveBeenCalled();
            expect(result.status).toBe('locked');
            expect(result.lockReason).toBe('Vi phạm quy định');
        });

        it('rejects locking without a reason', async () => {
            mockActorAndTarget(userDocument());
            await expect(lockUser(targetUserId.toString(), {}, actor)).rejects.toThrow(ApiError);
        });

        it('unlocks a user and clears the lock reason', async () => {
            const target = userDocument({ status: 'locked', lockReason: 'Lý do' });
            mockActorAndTarget(target);

            const result = await unlockUser(targetUserId.toString(), actor);

            expect(target.save).toHaveBeenCalled();
            expect(result.status).toBe('active');
            expect(result.lockReason).toBeNull();
        });

        it('revokes all sessions for a manageable user', async () => {
            mockActorAndTarget(userDocument());
            vi.spyOn(AuthSession, 'deleteMany').mockResolvedValue({ deletedCount: 3 } as never);

            await expect(revokeUserSessions(targetUserId.toString(), actor)).resolves.toEqual({
                userId: targetUserId.toString(),
                revokedSessions: 3,
            });
        });
    });
});
