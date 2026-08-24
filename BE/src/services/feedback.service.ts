import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { verifyFeedbackImageAssetToken } from '../helpers/locationAssetToken.helper.ts';
import Feedback, { type FeedbackStatus } from '../models/feedback.model.ts';
import { adminFeedbackQuerySchema, createFeedbackSchema, updateFeedbackSchema } from '../schemas/feedback.schema.ts';
import { ApiError } from '../utils/apiError.ts';

const validationError = (error: ZodError): never => {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu góp ý không hợp lệ.', {
        issues: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    });
};

const parseWith = <T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: ZodError } }, value: unknown) => {
    const result = schema.safeParse(value);
    return result.success ? result.data : validationError(result.error);
};

const resolveImages = (tokens: string[], actorId?: string) => {
    if (tokens.length > 0 && !actorId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Guest chỉ có thể gửi góp ý không kèm ảnh.');
    }
    const images = tokens.map((token, position) => {
        try {
            const asset = verifyFeedbackImageAssetToken(token);
            if (asset.sub !== actorId) throw new Error('Asset owner mismatch.');
            return { url: asset.url, publicId: asset.publicId ?? null, position };
        } catch {
            throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh góp ý không hợp lệ hoặc đã hết hạn.');
        }
    });
    const keys = images.map(({ publicId, url }) => publicId ?? url);
    if (new Set(keys).size !== keys.length) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh góp ý không được trùng nhau.');
    }
    return images;
};

export const createFeedback = async (input: unknown, actorId?: string) => {
    const data = parseWith(createFeedbackSchema, input);
    const feedback = await Feedback.create({
        userId: actorId ? new mongoose.Types.ObjectId(actorId) : null,
        type: data.type,
        title: data.title,
        description: data.description,
        contactEmail: data.contactEmail?.trim().toLowerCase() || null,
        images: resolveImages(data.imageAssetTokens, actorId),
        status: 'new',
    });
    return {
        id: feedback._id.toString(),
        type: feedback.type,
        title: feedback.title,
        status: feedback.status,
        createdAt: feedback.createdAt,
    };
};

const senderPayload = (user: unknown) => {
    if (!user || typeof user !== 'object' || !('_id' in user)) return { type: 'guest' as const };
    const sender = user as { _id: { toString: () => string }; displayName?: string; email?: string };
    return {
        type: 'user' as const,
        id: sender._id.toString(),
        displayName: sender.displayName ?? 'Người dùng',
        ...(sender.email ? { email: sender.email } : {}),
    };
};

const handlerPayload = (user: unknown) => {
    if (!user || typeof user !== 'object' || !('_id' in user)) return null;
    const handler = user as { _id: { toString: () => string }; displayName?: string };
    return { id: handler._id.toString(), displayName: handler.displayName ?? 'Admin' };
};

export const getAdminFeedbackList = async (rawQuery: unknown) => {
    const query = parseWith(adminFeedbackQuerySchema, rawQuery);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.q) filter.$or = [
        { title: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { description: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ];

    const [rows, total] = await Promise.all([
        Feedback.find(filter)
            .populate('userId', 'displayName')
            .sort({ createdAt: -1 })
            .skip((query.page - 1) * query.pageSize)
            .limit(query.pageSize)
            .lean(),
        Feedback.countDocuments(filter),
    ]);
    return {
        data: rows.map((row) => ({
            id: row._id.toString(),
            type: row.type,
            title: row.title,
            status: row.status,
            sender: senderPayload(row.userId),
            imageCount: row.images.length,
            createdAt: row.createdAt,
        })),
        meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
};

const requireFeedbackId = (feedbackId: string) => {
    if (!mongoose.isValidObjectId(feedbackId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy góp ý.');
    return feedbackId;
};

export const getAdminFeedbackDetail = async (feedbackId: string) => {
    const feedback = await Feedback.findById(requireFeedbackId(feedbackId))
        .populate('userId', 'displayName email')
        .populate('handledBy', 'displayName')
        .lean();
    if (!feedback) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy góp ý.');
    return {
        id: feedback._id.toString(),
        type: feedback.type,
        title: feedback.title,
        description: feedback.description,
        contactEmail: feedback.contactEmail,
        images: feedback.images,
        status: feedback.status,
        sender: senderPayload(feedback.userId),
        adminNote: feedback.adminNote,
        handledBy: handlerPayload(feedback.handledBy),
        handledAt: feedback.handledAt,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
    };
};

const allowedTransitions: Record<FeedbackStatus, FeedbackStatus[]> = {
    new: ['new', 'reviewing', 'closed'],
    reviewing: ['reviewing', 'resolved', 'closed'],
    resolved: ['resolved'],
    closed: ['closed'],
};

export const updateAdminFeedback = async (feedbackId: string, input: unknown, adminId: string) => {
    const data = parseWith(updateFeedbackSchema, input);
    const feedback = await Feedback.findById(requireFeedbackId(feedbackId));
    if (!feedback) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy góp ý.');
    if (!allowedTransitions[feedback.status].includes(data.status)) {
        throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Không thể chuyển sang trạng thái góp ý đã chọn.');
    }
    feedback.status = data.status;
    feedback.adminNote = data.adminNote?.trim() || null;
    if (data.status !== 'new') {
        feedback.handledBy = new mongoose.Types.ObjectId(adminId);
        feedback.handledAt = new Date();
    }
    await feedback.save();
    return getAdminFeedbackDetail(feedback._id.toString());
};
