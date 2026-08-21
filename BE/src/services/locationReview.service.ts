import mongoose from 'mongoose';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import { ApiError } from '../utils/apiError.ts';

const ensureValidLocationId = (locationId: string) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Địa điểm không tồn tại.');
    }
};

const ensureApprovedLocation = async (locationId: string) => {
    ensureValidLocationId(locationId);
    const exists = await Location.exists({ _id: locationId, status: 'approved' });
    if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Địa điểm không tồn tại hoặc chưa được công khai.');
};

const calculateAndStoreRatingSummary = async (locationId: string) => {
    const [summary] = await LocationReview.aggregate<{ average: number; count: number }>([
        { $match: { locationId: new mongoose.Types.ObjectId(locationId) } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingSummary = {
        average: Math.round((summary?.average ?? 0) * 10) / 10,
        count: summary?.count ?? 0,
    };
    await Location.updateOne({ _id: locationId }, { $set: { ratingSummary } });
    return ratingSummary;
};

export const getLocationReviews = async (locationId: string, rawPage?: string, rawPageSize?: string) => {
    await ensureApprovedLocation(locationId);
    const page = rawPage === undefined ? 1 : Number(rawPage);
    const pageSize = rawPageSize === undefined ? 10 : Number(rawPageSize);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'page phải từ 1 và pageSize phải từ 1 đến 50.');
    }
    const [reviews, total] = await Promise.all([
        LocationReview.find({ locationId })
            .sort({ updatedAt: -1, _id: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate('userId', 'displayName avatarUrl')
            .lean(),
        LocationReview.countDocuments({ locationId }),
    ]);

    const data = reviews.map((review) => {
        const author = review.userId as unknown as { _id: mongoose.Types.ObjectId; displayName: string; avatarUrl?: string };
        return {
            id: review._id.toString(),
            userId: author._id.toString(),
            author: { displayName: author.displayName, avatarUrl: author.avatarUrl ?? null },
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        };
    });
    return {
        data,
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
};

export const getMyLocationReview = async (locationId: string, userId: string) => {
    await ensureApprovedLocation(locationId);
    const review = await LocationReview.findOne({ locationId, userId }).lean();
    if (!review) return null;

    return {
        id: review._id.toString(),
        userId: review.userId.toString(),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
    };
};

export const saveLocationReview = async (
    locationId: string,
    input: { rating?: unknown; comment?: unknown },
    userId: string,
) => {
    await ensureApprovedLocation(locationId);
    if (!Number.isInteger(input.rating) || Number(input.rating) < 1 || Number(input.rating) > 5) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Số sao phải là số nguyên từ 1 đến 5.');
    }
    if (input.comment !== undefined && typeof input.comment !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Nội dung đánh giá phải là chuỗi.');
    }
    const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
    if (comment.length > 1000) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Nội dung đánh giá không được vượt quá 1000 ký tự.');
    }

    const review = await LocationReview.findOneAndUpdate(
        { locationId, userId },
        { $set: { rating: Number(input.rating), comment } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const ratingSummary = await calculateAndStoreRatingSummary(locationId);

    return { id: review._id.toString(), rating: review.rating, comment: review.comment, updatedAt: review.updatedAt, ratingSummary };
};

export const deleteMyLocationReview = async (locationId: string, userId: string) => {
    await ensureApprovedLocation(locationId);
    const result = await LocationReview.deleteOne({ locationId, userId });
    const ratingSummary = await calculateAndStoreRatingSummary(locationId);

    return { deleted: result.deletedCount > 0, ratingSummary };
};
