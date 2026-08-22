import mongoose from 'mongoose';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import type { LocationReviewStatus } from '../models/locationReview.model.ts';
import { ApiError } from '../utils/apiError.ts';

const EMPTY_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const publicStatusFilter = {
    $or: [{ status: 'active' as const }, { status: { $exists: false } }],
};

interface PublicReviewQuery {
    page?: string | undefined;
    pageSize?: string | undefined;
    rating?: string | undefined;
    sortBy?: string | undefined;
    hasComment?: string | undefined;
}

interface AdminReviewQuery {
    page?: string | undefined;
    pageSize?: string | undefined;
    status?: string | undefined;
}

interface MyReviewQuery {
    page?: string | undefined;
    pageSize?: string | undefined;
}

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

const positiveInteger = (rawValue: string | undefined, fallback: number, maximum?: number) => {
    if (rawValue === undefined) return fallback;
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 1 || (maximum !== undefined && value > maximum)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin phân trang không hợp lệ.');
    }
    return value;
};

const calculateAndStoreRatingSummary = async (locationId: string) => {
    const rows = await LocationReview.aggregate<{ _id: number; count: number }>([
        {
            $match: {
                locationId: new mongoose.Types.ObjectId(locationId),
                ...publicStatusFilter,
            },
        },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const distribution = { ...EMPTY_DISTRIBUTION };
    for (const row of rows) {
        if (row._id >= 1 && row._id <= 5) {
            distribution[row._id as keyof typeof distribution] = row.count;
        }
    }
    const count = Object.values(distribution).reduce((total, amount) => total + amount, 0);
    const totalScore = Object.entries(distribution)
        .reduce((total, [rating, amount]) => total + Number(rating) * amount, 0);
    const ratingSummary = {
        average: count === 0 ? 0 : Math.round((totalScore / count) * 10) / 10,
        count,
        distribution,
    };
    await Location.updateOne({ _id: locationId }, { $set: { ratingSummary } });
    return ratingSummary;
};

export const getLocationReviews = async (locationId: string, query: PublicReviewQuery = {}) => {
    await ensureApprovedLocation(locationId);
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 10, 50);
    const rating = query.rating === undefined ? undefined : Number(query.rating);
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Bộ lọc số sao phải là số nguyên từ 1 đến 5.');
    }
    const supportedSorts = ['newest', 'oldest', 'highest', 'lowest'] as const;
    const sortBy = query.sortBy ?? 'newest';
    if (!supportedSorts.includes(sortBy as (typeof supportedSorts)[number])) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Cách sắp xếp đánh giá không hợp lệ.');
    }
    if (query.hasComment !== undefined && !['true', 'false'].includes(query.hasComment)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'hasComment phải là true hoặc false.');
    }

    const filter = {
        locationId,
        ...publicStatusFilter,
        ...(rating === undefined ? {} : { rating }),
        ...(query.hasComment === 'true' ? { comment: { $ne: '' } } : {}),
    };
    const sortOptions: Record<string, Record<string, 1 | -1>> = {
        newest: { updatedAt: -1, _id: -1 },
        oldest: { updatedAt: 1, _id: 1 },
        highest: { rating: -1, updatedAt: -1, _id: -1 },
        lowest: { rating: 1, updatedAt: -1, _id: -1 },
    };
    const [reviews, total] = await Promise.all([
        LocationReview.find(filter)
            .sort(sortOptions[sortBy])
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate('userId', 'displayName avatarUrl')
            .lean(),
        LocationReview.countDocuments(filter),
    ]);

    const data = reviews.map((review) => {
        const author = review.userId as unknown as {
            _id: mongoose.Types.ObjectId;
            displayName: string;
            avatarUrl?: string;
        };
        return {
            id: review._id.toString(),
            userId: author._id.toString(),
            author: { displayName: author.displayName, avatarUrl: author.avatarUrl ?? null },
            rating: review.rating,
            comment: review.comment,
            isEdited: Boolean(review.editedAt),
            editedAt: review.editedAt ?? null,
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
    const review = await LocationReview.findOne({
        locationId,
        userId,
        status: { $ne: 'deleted' },
    }).lean();
    if (!review) return null;

    return {
        id: review._id.toString(),
        userId: review.userId.toString(),
        rating: review.rating,
        comment: review.comment,
        status: review.status ?? 'active',
        isEdited: Boolean(review.editedAt),
        editedAt: review.editedAt ?? null,
        hiddenReason: review.hiddenReason ?? null,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
    };
};

export const getMyLocationReviews = async (userId: string, query: MyReviewQuery = {}) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 10, 50);
    const filter = { userId, status: { $ne: 'deleted' as const } };

    const [reviews, total] = await Promise.all([
        LocationReview.find(filter)
            .sort({ updatedAt: -1, _id: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate('locationId', 'name images status')
            .lean(),
        LocationReview.countDocuments(filter),
    ]);

    const data = reviews.flatMap((review) => {
        const location = review.locationId as unknown as {
            _id: mongoose.Types.ObjectId;
            name: string;
            images?: Array<{ url: string; position: number }>;
            status: string;
        } | null;
        if (!location) return [];

        const coverImageUrl = [...(location.images ?? [])]
            .sort((left, right) => left.position - right.position)[0]?.url ?? null;
        return [{
            id: review._id.toString(),
            location: {
                id: location._id.toString(),
                name: location.name,
                coverImageUrl,
                status: location.status,
            },
            rating: review.rating,
            comment: review.comment,
            status: review.status ?? 'active',
            isEdited: Boolean(review.editedAt),
            editedAt: review.editedAt ?? null,
            hiddenReason: review.hiddenReason ?? null,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        }];
    });

    return {
        data,
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
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
    const rating = Number(input.rating);
    const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
    if (comment.length > 1000) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Nội dung đánh giá không được vượt quá 1000 ký tự.');
    }

    const existingReview = await LocationReview.findOne({ locationId, userId });
    let review;
    if (!existingReview) {
        review = await LocationReview.create({ locationId, userId, rating, comment, status: 'active' });
    } else {
        const wasDeleted = existingReview.status === 'deleted';
        const contentChanged = existingReview.rating !== rating || existingReview.comment !== comment;
        const countsAsEdit = wasDeleted || contentChanged;
        const status: LocationReviewStatus = wasDeleted ? 'active' : (existingReview.status ?? 'active');
        review = await LocationReview.findByIdAndUpdate(
            existingReview._id,
            {
                $set: {
                    rating,
                    comment,
                    status,
                    ...(wasDeleted ? {
                        deletedAt: null,
                        hiddenAt: null,
                        hiddenBy: null,
                        hiddenReason: null,
                    } : {}),
                    ...(countsAsEdit ? { editedAt: new Date() } : {}),
                },
                ...(countsAsEdit ? { $inc: { editCount: 1 } } : {}),
            },
            { new: true, runValidators: true },
        );
    }
    if (!review) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');

    const ratingSummary = await calculateAndStoreRatingSummary(locationId);
    return {
        id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        isEdited: Boolean(review.editedAt),
        editedAt: review.editedAt ?? null,
        updatedAt: review.updatedAt,
        ratingSummary,
    };
};

export const deleteMyLocationReview = async (locationId: string, userId: string) => {
    await ensureApprovedLocation(locationId);
    const review = await LocationReview.findOneAndUpdate(
        { locationId, userId, status: { $ne: 'deleted' } },
        { $set: { status: 'deleted', deletedAt: new Date() } },
        { new: true },
    );
    const ratingSummary = await calculateAndStoreRatingSummary(locationId);
    return { deleted: Boolean(review), ratingSummary };
};

export const getAdminLocationReviews = async (query: AdminReviewQuery = {}) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 20, 100);
    if (query.status !== undefined && !['active', 'deleted', 'hidden'].includes(query.status)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái đánh giá không hợp lệ.');
    }
    const filter = query.status === 'active'
        ? publicStatusFilter
        : query.status
            ? { status: query.status as LocationReviewStatus }
            : {};
    const [reviews, total] = await Promise.all([
        LocationReview.find(filter)
            .sort({ updatedAt: -1, _id: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate('userId', 'displayName email avatarUrl')
            .populate('locationId', 'name')
            .lean(),
        LocationReview.countDocuments(filter),
    ]);
    return {
        data: reviews.map((review) => {
            const author = review.userId as unknown as {
                _id: mongoose.Types.ObjectId; displayName: string; email: string;
            };
            const location = review.locationId as unknown as { _id: mongoose.Types.ObjectId; name: string };
            return {
                id: review._id.toString(),
                author: { id: author._id.toString(), displayName: author.displayName, email: author.email },
                location: { id: location._id.toString(), name: location.name },
                rating: review.rating,
                comment: review.comment,
                status: review.status ?? 'active',
                isEdited: Boolean(review.editedAt),
                hiddenReason: review.hiddenReason ?? null,
                updatedAt: review.updatedAt,
            };
        }),
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
};

export const setLocationReviewVisibility = async (
    reviewId: string,
    input: { status?: unknown; reason?: unknown },
    adminId: string,
) => {
    if (!mongoose.isValidObjectId(reviewId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
    }
    if (input.status !== 'active' && input.status !== 'hidden') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Admin chỉ có thể công khai hoặc ẩn đánh giá.');
    }
    if (input.reason !== undefined && typeof input.reason !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Lý do ẩn phải là chuỗi.');
    }
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (input.status === 'hidden' && !reason) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập lý do ẩn đánh giá.');
    }
    if (reason.length > 500) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Lý do ẩn không được vượt quá 500 ký tự.');
    }

    const existingReview = await LocationReview.findById(reviewId);
    if (!existingReview) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
    if (existingReview.status === 'deleted') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Không thể khôi phục đánh giá do người dùng đã xóa.');
    }
    const hidden = input.status === 'hidden';
    const review = await LocationReview.findByIdAndUpdate(
        reviewId,
        {
            $set: {
                status: input.status,
                hiddenAt: hidden ? new Date() : null,
                hiddenBy: hidden ? adminId : null,
                hiddenReason: hidden ? reason : null,
            },
        },
        { new: true, runValidators: true },
    );
    const ratingSummary = await calculateAndStoreRatingSummary(existingReview.locationId.toString());
    return { id: reviewId, status: review?.status ?? input.status, ratingSummary };
};
