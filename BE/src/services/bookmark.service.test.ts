import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Bookmark from '../models/bookmark.model.ts';
import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { addBookmark, removeBookmark } from './bookmark.service.ts';

vi.mock('../models/bookmark.model.ts', () => ({
    default: { create: vi.fn(), deleteOne: vi.fn() },
}));
vi.mock('../models/location.model.ts', () => ({ default: { exists: vi.fn() } }));
vi.mock('../models/itinerary.model.ts', () => ({ default: { exists: vi.fn() } }));
vi.mock('../models/user.model.ts', () => ({ default: {} }));

const targetId = new mongoose.Types.ObjectId().toString();

describe('bookmark service', () => {
    beforeEach(() => vi.clearAllMocks());

    it('creates a bookmark for an approved location', async () => {
        vi.mocked(Location.exists).mockResolvedValue({ _id: targetId } as never);
        vi.mocked(Bookmark.create).mockResolvedValue({
            _id: { toString: () => 'bookmark-1' },
            targetType: 'location',
            targetId: { toString: () => targetId },
            createdAt: new Date('2026-08-12T00:00:00.000Z'),
        } as never);

        const result = await addBookmark('user-1', { targetType: 'location', targetId });

        expect(Location.exists).toHaveBeenCalledWith({ _id: targetId, status: 'approved' });
        expect(Bookmark.create).toHaveBeenCalledWith({ userId: 'user-1', targetType: 'location', targetId });
        expect(result).toMatchObject({ id: 'bookmark-1', targetType: 'location', targetId });
    });

    it('requires an active public itinerary before creating its bookmark', async () => {
        vi.mocked(Itinerary.exists).mockResolvedValue(null);

        await expect(addBookmark('user-1', { targetType: 'itinerary', targetId }))
            .rejects.toMatchObject<ApiError>({ statusCode: 404, code: 'NOT_FOUND' });

        expect(Itinerary.exists).toHaveBeenCalledWith({
            _id: targetId, visibility: 'public', status: 'active', isDeleted: false,
        });
        expect(Bookmark.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid polymorphic target', async () => {
        await expect(addBookmark('user-1', { targetType: 'review', targetId }))
            .rejects.toMatchObject<ApiError>({ statusCode: 400, code: 'VALIDATION_ERROR' });
        await expect(addBookmark('user-1', { targetType: 'location', targetId: 'invalid-id' }))
            .rejects.toMatchObject<ApiError>({ statusCode: 400, code: 'VALIDATION_ERROR' });
    });

    it('deletes only the current user bookmark', async () => {
        vi.mocked(Bookmark.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as never);

        await removeBookmark('user-1', 'location', targetId);

        expect(Bookmark.deleteOne).toHaveBeenCalledWith({ userId: 'user-1', targetType: 'location', targetId });
    });

    it('returns not found when the bookmark does not belong to the user', async () => {
        vi.mocked(Bookmark.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 0 } as never);

        await expect(removeBookmark('user-1', 'location', targetId))
            .rejects.toMatchObject<ApiError>({ statusCode: 404, code: 'NOT_FOUND' });
    });
});
