import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Bookmark from '../models/bookmark.model.ts';
import Location from '../models/location.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { createBookmark, getUserBookmarks } from './bookmark.service.ts';

const userId = new mongoose.Types.ObjectId();
const locationId = new mongoose.Types.ObjectId();
const bookmarkId = new mongoose.Types.ObjectId();
const createdAt = new Date('2026-08-24T03:00:00.000Z');

const bookmarkRecord = {
    _id: bookmarkId,
    userId,
    targetType: 'location' as const,
    targetId: locationId,
    createdAt,
};

const mockBookmarkList = () => {
    vi.spyOn(Bookmark, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([bookmarkRecord]),
        }),
    } as never);
};

const mockLocationList = (status: 'approved' | 'hidden', isDeleted = false) => {
    vi.spyOn(Location, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ _id: locationId, status, isDeleted }]),
        }),
    } as never);
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('location bookmark availability', () => {
    it('keeps a soft-deleted location bookmark but marks it removed', async () => {
        mockBookmarkList();
        mockLocationList('hidden', true);

        const result = await getUserBookmarks(userId.toString());

        expect(result.location).toEqual([
            expect.objectContaining({
                targetId: locationId.toString(),
                availability: 'unavailable',
                unavailableReason: 'removed',
            }),
        ]);
    });

    it('keeps a hidden location bookmark but marks it unavailable', async () => {
        mockBookmarkList();
        mockLocationList('hidden');

        const result = await getUserBookmarks(userId.toString());

        expect(result.location).toEqual([
            expect.objectContaining({
                targetId: locationId.toString(),
                availability: 'unavailable',
                unavailableReason: 'hidden',
            }),
        ]);
    });

    it('marks an approved location bookmark available again after restore', async () => {
        mockBookmarkList();
        mockLocationList('approved');

        const result = await getUserBookmarks(userId.toString());

        expect(result.location).toEqual([
            expect.objectContaining({
                targetId: locationId.toString(),
                availability: 'available',
                unavailableReason: null,
            }),
        ]);
    });

    it('rejects creating a bookmark for a hidden location', async () => {
        vi.spyOn(Location, 'exists').mockResolvedValue(null);
        const createSpy = vi.spyOn(Bookmark, 'create');

        await expect(createBookmark({
            userId: userId.toString(),
            targetType: 'location',
            targetId: locationId.toString(),
        })).rejects.toMatchObject<Partial<ApiError>>({
            statusCode: 404,
            code: 'BOOKMARK_TARGET_UNAVAILABLE',
        });
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('creates a bookmark when the location is public', async () => {
        vi.spyOn(Location, 'exists').mockResolvedValue({ _id: locationId } as never);
        vi.spyOn(Bookmark, 'findOne').mockResolvedValue(null);
        vi.spyOn(Bookmark, 'create').mockResolvedValue(bookmarkRecord as never);

        const result = await createBookmark({
            userId: userId.toString(),
            targetType: 'location',
            targetId: locationId.toString(),
        });

        expect(result).toMatchObject({
            targetType: 'location',
            targetId: locationId.toString(),
        });
        expect(Location.exists).toHaveBeenCalledWith({
            _id: locationId.toString(),
            status: 'approved',
            isDeleted: { $ne: true },
        });
    });
});
