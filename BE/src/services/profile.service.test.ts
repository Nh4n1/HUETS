import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { updateCurrentUser } from './profile.service.ts';

const userId = new mongoose.Types.ObjectId();

const updatedUser = (overrides: Record<string, unknown> = {}) => ({
    _id: userId,
    displayName: 'Nguyễn Văn A',
    email: 'user@example.com',
    avatarUrl: undefined,
    bio: 'Yêu Huế',
    role: 'user',
    status: 'active',
    ...overrides,
});

describe('profile.service', () => {
    const mockCurrentUser = () => {
        vi.spyOn(User, 'findById').mockResolvedValue(updatedUser() as never);
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('updates and trims the supported profile fields', async () => {
        mockCurrentUser();
        const findByIdAndUpdate = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(
            updatedUser() as never,
        );

        const result = await updateCurrentUser(userId.toString(), {
            displayName: '  Nguyễn Văn A  ',
            bio: '  Yêu Huế  ',
        });

        expect(findByIdAndUpdate).toHaveBeenCalledWith(
            userId.toString(),
            { $set: { displayName: 'Nguyễn Văn A', bio: 'Yêu Huế' } },
            { new: true, runValidators: true },
        );
        expect(result).toMatchObject({
            id: userId.toString(),
            displayName: 'Nguyễn Văn A',
            bio: 'Yêu Huế',
            avatarUrl: null,
        });
    });

    it('stores an empty bio as null', async () => {
        mockCurrentUser();
        const findByIdAndUpdate = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(
            updatedUser({ bio: null }) as never,
        );

        await updateCurrentUser(userId.toString(), { bio: '   ' });

        expect(findByIdAndUpdate).toHaveBeenCalledWith(
            userId.toString(),
            { $set: { bio: null } },
            { new: true, runValidators: true },
        );
    });

    it.each([
        [{}, 'empty input'],
        [{ displayName: 'A' }, 'short display name'],
        [{ displayName: 123 }, 'non-string display name'],
        [{ bio: 'a'.repeat(501) }, 'long bio'],
        [{ bio: false }, 'non-string bio'],
    ])('rejects invalid profile input: %s (%s)', async (input) => {
        await expect(updateCurrentUser(userId.toString(), input)).rejects.toBeInstanceOf(ApiError);
    });

    it('does not pass unsupported fields to the database update', async () => {
        mockCurrentUser();
        const findByIdAndUpdate = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(
            updatedUser() as never,
        );

        await updateCurrentUser(userId.toString(), {
            displayName: 'Nguyễn Văn A',
            role: 'admin',
            email: 'other@example.com',
        } as never);

        expect(findByIdAndUpdate).toHaveBeenCalledWith(
            userId.toString(),
            { $set: { displayName: 'Nguyễn Văn A' } },
            { new: true, runValidators: true },
        );
    });
});
