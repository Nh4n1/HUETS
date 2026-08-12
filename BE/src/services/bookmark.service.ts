import mongoose from 'mongoose';
import Bookmark from '../models/bookmark.model.ts';
import type { BookmarkTargetType } from '../models/bookmark.model.ts';
import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const validateTargetType = (value: unknown): BookmarkTargetType => {
    if (value !== 'location' && value !== 'itinerary') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'targetType phải là location hoặc itinerary.');
    }
    return value;
};

const validateTargetId = (value: unknown) => {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'targetId không hợp lệ.');
    }
    return value;
};

const ensurePublicTarget = async (targetType: BookmarkTargetType, targetId: string) => {
    const target = targetType === 'location'
        ? await Location.exists({ _id: targetId, status: 'approved' })
        : await Itinerary.exists({
            _id: targetId,
            visibility: 'public',
            status: 'active',
            isDeleted: false,
        });

    if (!target) {
        throw new ApiError(404, 'NOT_FOUND', 'Nội dung không tồn tại hoặc hiện không thể truy cập.');
    }
};

export const addBookmark = async (
    userId: string,
    input: { targetType?: unknown; targetId?: unknown },
) => {
    const targetType = validateTargetType(input.targetType);
    const targetId = validateTargetId(input.targetId);
    await ensurePublicTarget(targetType, targetId);

    try {
        const bookmark = await Bookmark.create({ userId, targetType, targetId });
        return {
            id: bookmark._id.toString(),
            targetType: bookmark.targetType,
            targetId: bookmark.targetId.toString(),
            createdAt: bookmark.createdAt,
        };
    } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
            throw new ApiError(409, 'BOOKMARK_ALREADY_EXISTS', 'Nội dung này đã được lưu trước đó.');
        }
        throw error;
    }
};

export const removeBookmark = async (
    userId: string,
    rawTargetType: unknown,
    rawTargetId: unknown,
) => {
    const targetType = validateTargetType(rawTargetType);
    const targetId = validateTargetId(rawTargetId);
    const result = await Bookmark.deleteOne({ userId, targetType, targetId });

    if (!result.deletedCount) {
        throw new ApiError(404, 'NOT_FOUND', 'Bookmark không tồn tại.');
    }
};

export interface BookmarkListQuery {
    targetType?: unknown;
    page?: unknown;
    pageSize?: unknown;
}

const parsePositiveInteger = (value: unknown, fallback: number, field: string, max?: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${field} không hợp lệ.`);
    }
    const parsed = Number(value);
    if (parsed < 1 || (max !== undefined && parsed > max)) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${field} không hợp lệ.`);
    }
    return parsed;
};

export const getMyBookmarks = async (userId: string, query: BookmarkListQuery) => {
    const targetType = query.targetType === undefined ? undefined : validateTargetType(query.targetType);
    const page = parsePositiveInteger(query.page, 1, 'page');
    const pageSize = parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE, 'pageSize', MAX_PAGE_SIZE);
    const filter = { userId, ...(targetType ? { targetType } : {}) };

    const [bookmarks, total] = await Promise.all([
        Bookmark.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Bookmark.countDocuments(filter),
    ]);

    const locationIds = bookmarks.filter((item) => item.targetType === 'location').map((item) => item.targetId);
    const itineraryIds = bookmarks.filter((item) => item.targetType === 'itinerary').map((item) => item.targetId);
    const [locations, itineraries] = await Promise.all([
        Location.find({ _id: { $in: locationIds }, status: 'approved' })
            .select({ name: 1, categoryCode: 1, address: 1, images: 1, ratingSummary: 1 })
            .lean(),
        Itinerary.find({
            _id: { $in: itineraryIds }, visibility: 'public', status: 'active', isDeleted: false,
        }).select({ ownerId: 1, title: 1, days: 1 }).lean(),
    ]);

    const ownerIds = itineraries.map((item) => item.ownerId);
    const owners = await User.find({ _id: { $in: ownerIds } }).select({ displayName: 1, avatarUrl: 1 }).lean();
    const locationMap = new Map(locations.map((item) => [item._id.toString(), item]));
    const itineraryMap = new Map(itineraries.map((item) => [item._id.toString(), item]));
    const ownerMap = new Map(owners.map((item) => [item._id.toString(), item]));

    const data = bookmarks.map((bookmark) => {
        const targetId = bookmark.targetId.toString();
        if (bookmark.targetType === 'location') {
            const location = locationMap.get(targetId);
            return {
                id: bookmark._id.toString(), targetType: bookmark.targetType, targetId,
                createdAt: bookmark.createdAt, availability: location ? 'available' : 'unavailable',
                target: location ? {
                    id: targetId,
                    name: location.name,
                    coverImageUrl: [...location.images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
                    categoryCode: location.categoryCode,
                    formattedAddress: [location.address.addressLine, location.address.wardNameSnapshot].filter(Boolean).join(', '),
                    averageRating: location.ratingSummary.average,
                    reviewCount: location.ratingSummary.count,
                } : null,
            };
        }

        const itinerary = itineraryMap.get(targetId);
        const owner = itinerary ? ownerMap.get(itinerary.ownerId.toString()) : undefined;
        return {
            id: bookmark._id.toString(), targetType: bookmark.targetType, targetId,
            createdAt: bookmark.createdAt, availability: itinerary ? 'available' : 'unavailable',
            target: itinerary ? {
                id: targetId,
                title: itinerary.title,
                owner: owner ? { id: owner._id.toString(), displayName: owner.displayName, avatarUrl: owner.avatarUrl ?? null } : null,
                dayCount: itinerary.days.length,
                itemCount: itinerary.days.reduce((count, day) => count + day.items.length, 0),
            } : null,
        };
    });

    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};
