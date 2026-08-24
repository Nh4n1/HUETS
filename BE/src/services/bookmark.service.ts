import mongoose from 'mongoose';
import Bookmark from '../models/bookmark.model.ts';
import Location from '../models/location.model.ts';
import { ApiError } from '../utils/apiError.ts';

export const SUPPORTED_TARGET_TYPES = ['location', 'itinerary'] as const;
export type BookmarkTargetType = (typeof SUPPORTED_TARGET_TYPES)[number];



interface CreateBookmarkInput {
    userId: string;
    targetType: unknown;
    targetId: unknown;
}

interface DeleteBookmarkInput {
    userId: string;
    targetType: unknown;
    targetId: unknown;
}

const normalizeObjectId = (value: unknown, fieldName: string) => {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${fieldName} không hợp lệ.`);
    }
    return value;
};

const normalizeTargetType = (value: unknown): BookmarkTargetType => {
    if (typeof value !== 'string' || !SUPPORTED_TARGET_TYPES.includes(value as BookmarkTargetType)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'targetType không hợp lệ. Chỉ hỗ trợ: location, itinerary.');
    }
    return value as BookmarkTargetType;
};

const toBookmarkPayload = (bookmark: {
    _id: { toString: () => string };
    userId: { toString: () => string };
    targetType: BookmarkTargetType;
    targetId: { toString: () => string };
    createdAt: Date;
}) => ({
    id: bookmark._id.toString(),
    userId: bookmark.userId.toString(),
    targetType: bookmark.targetType,
    targetId: bookmark.targetId.toString(),
    createdAt: bookmark.createdAt,
});

const assertTargetAvailable = async (targetType: BookmarkTargetType, targetId: string) => {
    if (targetType !== 'location') return;

    const locationExists = await Location.exists({
        _id: targetId,
        status: 'approved',
        isDeleted: { $ne: true },
    });
    if (!locationExists) {
        throw new ApiError(
            404,
            'BOOKMARK_TARGET_UNAVAILABLE',
            'Địa điểm không tồn tại hoặc hiện không khả dụng để lưu.',
        );
    }
};

export const createBookmark = async ({ userId, targetType, targetId }: CreateBookmarkInput) => {
    const normalizedUserId = normalizeObjectId(userId, 'userId');
    const normalizedTargetType = normalizeTargetType(targetType);
    const normalizedTargetId = normalizeObjectId(targetId, 'targetId');

    await assertTargetAvailable(normalizedTargetType, normalizedTargetId);

    const existedBookmark = await Bookmark.findOne({
        userId: normalizedUserId,
        targetType: normalizedTargetType,
        targetId: normalizedTargetId,
    });

    if (existedBookmark) {
        throw new ApiError(409, 'BOOKMARK_ALREADY_EXISTS', 'Bookmark này đã tồn tại.');
    }

    const bookmark = await Bookmark.create({
        userId: normalizedUserId,
        targetType: normalizedTargetType,
        targetId: normalizedTargetId,
    });

    return toBookmarkPayload(bookmark);
};

export const deleteBookmark = async ({ userId, targetType, targetId }: DeleteBookmarkInput) => {
    const normalizedUserId = normalizeObjectId(userId, 'userId');
    const normalizedTargetType = normalizeTargetType(targetType);
    const normalizedTargetId = normalizeObjectId(targetId, 'targetId');

    const result = await Bookmark.deleteOne({
        userId: normalizedUserId,
        targetType: normalizedTargetType,
        targetId: normalizedTargetId,
    });

    if (result.deletedCount === 0) {
        throw new ApiError(404, 'BOOKMARK_NOT_FOUND', 'Bookmark không tồn tại.');
    }

    return { deleted: true };
};

export const getUserBookmarks = async (userId: string, rawType?: string) => {
    const normalizedUserId = normalizeObjectId(userId, 'userId');
    const type = rawType === undefined ? undefined : normalizeTargetType(rawType);

    const bookmarks = await Bookmark.find({
        userId: normalizedUserId,
        ...(type ? { targetType: type } : {}),
    })
        .sort({ createdAt: -1 })
        .lean();

    const locationTargetIds = bookmarks
        .filter(({ targetType }) => targetType === 'location')
        .map(({ targetId }) => targetId);
    const locations = locationTargetIds.length > 0
        ? await Location.find({ _id: { $in: locationTargetIds } })
            .select({ _id: 1, status: 1, isDeleted: 1 })
            .lean()
        : [];
    const locationById = new Map(locations.map((location) => [location._id.toString(), location]));

    const mappedBookmarks = bookmarks.map((bookmark) => {
        const payload = toBookmarkPayload(bookmark);
        if (bookmark.targetType !== 'location') return payload;

        const location = locationById.get(bookmark.targetId.toString());
        const available = location?.status === 'approved' && location.isDeleted !== true;
        return {
            ...payload,
            availability: available ? 'available' as const : 'unavailable' as const,
            unavailableReason: available
                ? null
                : location?.status === 'hidden'
                    ? 'hidden' as const
                    : location?.isDeleted === true || !location
                        ? 'removed' as const
                        : 'not_public' as const,
        };
    });

    if (type) {
        return mappedBookmarks;
    }

    return mappedBookmarks.reduce<Record<BookmarkTargetType, Array<(typeof mappedBookmarks)[number]>>>(
        (groupedBookmarks, bookmark) => {
            groupedBookmarks[bookmark.targetType].push(bookmark);
            return groupedBookmarks;
        },
        { location: [], itinerary: [] },
    );
};
