import mongoose from 'mongoose';
import { verifyReportImageAssetToken } from '../helpers/locationAssetToken.helper.ts';
import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import Report, {
    REPORT_REASON_CODES,
    REPORT_STATUSES,
    REPORT_TARGET_TYPES,
} from '../models/report.model.ts';
import type {
    IReportTargetSnapshot,
    ReportReasonCode,
    ReportStatus,
    ReportTargetType,
} from '../models/report.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

const CREATE_FIELDS = new Set(['targetType', 'targetId', 'reasonCode', 'detail', 'imageAssetTokens']);
const UPDATE_STATUS_FIELDS = new Set(['status', 'resolutionNote', 'expectedUpdatedAt']);
const ADMIN_REPORT_STATUSES: ReportStatus[] = [...REPORT_STATUSES];

interface CreateReportBody {
    targetType?: unknown;
    targetId?: unknown;
    reasonCode?: unknown;
    detail?: unknown;
    imageAssetTokens?: unknown;
}

interface UpdateReportStatusBody {
    status?: unknown;
    resolutionNote?: unknown;
    expectedUpdatedAt?: unknown;
}

export interface AdminReportQuery {
    page?: string;
    pageSize?: string;
    status?: string;
    targetType?: string;
    reasonCode?: string;
    q?: string;
}

interface PopulatedReporter {
    _id: unknown;
    displayName: string;
    email: string;
    avatarUrl?: string;
}

interface ReportRecord {
    _id: unknown;
    reporterId: unknown;
    targetType: ReportTargetType;
    targetId: unknown;
    reasonCode: ReportReasonCode;
    detail: string;
    status: ReportStatus;
    targetSnapshot: {
        label: string;
        excerpt: string;
        ownerId: unknown;
        contextId: unknown | null;
        targetUpdatedAt: Date;
    };
    resolution?: {
        handledBy?: unknown | null;
        handledAt?: Date | null;
        note?: string | null;
    };
    evidenceImages?: Array<{ url: string; publicId?: string | null; position: number }>;
    createdAt: Date;
    updatedAt: Date;
}

const validationError = (message: string, details?: Record<string, unknown>): never => {
    throw new ApiError(400, 'VALIDATION_ERROR', message, details);
};

const assertBody = <T extends object>(input: unknown, allowedFields: Set<string>): T => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return validationError('Body request phải là một object JSON.');
    }
    const unknownFields = Object.keys(input).filter((field) => !allowedFields.has(field));
    if (unknownFields.length > 0) {
        return validationError('Body request chứa field không được hỗ trợ.', { unknownFields });
    }
    return input as T;
};

const normalizeObjectId = (value: unknown, fieldName: string) => {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
        return validationError(`${fieldName} không hợp lệ.`);
    }
    return value;
};

const normalizeTargetType = (value: unknown): ReportTargetType => {
    if (typeof value !== 'string' || !REPORT_TARGET_TYPES.includes(value as ReportTargetType)) {
        return validationError(
            'targetType không hợp lệ. Chỉ hỗ trợ: location, locationReview, itinerary.',
        );
    }
    return value as ReportTargetType;
};

const normalizeReasonCode = (value: unknown): ReportReasonCode => {
    if (typeof value !== 'string' || !REPORT_REASON_CODES.includes(value as ReportReasonCode)) {
        return validationError(
            'reasonCode không hợp lệ. Chỉ hỗ trợ: spam, inappropriate, incorrect_info, offensive, other.',
        );
    }
    return value as ReportReasonCode;
};

const normalizeDetail = (value: unknown, reasonCode: ReportReasonCode) => {
    if (value !== undefined && value !== null && typeof value !== 'string') {
        return validationError('Nội dung mô tả phải là chuỗi.');
    }
    const detail = typeof value === 'string' ? value.trim() : '';
    if (detail.length > 500) {
        return validationError('Nội dung mô tả không được vượt quá 500 ký tự.');
    }
    if (reasonCode === 'other' && detail.length < 10) {
        return validationError('Lý do khác phải có mô tả tối thiểu 10 ký tự.');
    }
    return detail;
};

const normalizeImageAssetTokens = (value: unknown) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'imageAssetTokens phải là một mảng.');
    }
    if (value.length > 3) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Mỗi báo cáo chỉ được đính kèm tối đa 3 ảnh.');
    }
    if (value.some((token) => typeof token !== 'string' || !token.trim())) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Token ảnh chứng cứ không hợp lệ.');
    }
    if (new Set(value).size !== value.length) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh chứng cứ không được trùng nhau.');
    }
    return value as string[];
};

const resolveEvidenceImages = (tokens: string[], reporterId: string) => {
    const seenAssets = new Set<string>();
    return tokens.map((token, position) => {
        try {
            const asset = verifyReportImageAssetToken(token);
            if (asset.sub !== reporterId) throw new Error('Asset owner mismatch.');
            const assetKey = asset.publicId || asset.url;
            if (seenAssets.has(assetKey)) throw new Error('Duplicate image asset.');
            seenAssets.add(assetKey);
            return { url: asset.url, publicId: asset.publicId ?? null, position };
        } catch {
            throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Token ảnh chứng cứ không hợp lệ hoặc đã hết hạn.');
        }
    });
};

const normalizeLabel = (value: string) => value.trim().slice(0, 200);
const normalizeExcerpt = (value: string) => value.trim().slice(0, 1000);

const asObjectId = (value: { toString: () => string } | string) =>
    new mongoose.Types.ObjectId(value.toString());

const reportTargetNotFound = (): never => {
    throw new ApiError(404, 'NOT_FOUND', 'Nội dung không tồn tại hoặc không thể báo cáo.');
};

const resolveLocationTarget = async (targetId: string): Promise<IReportTargetSnapshot> => {
    const location = await Location.findOne({ _id: targetId, status: 'approved' })
        .select({ name: 1, description: 1, createdBy: 1, updatedAt: 1 })
        .lean();
    if (!location) return reportTargetNotFound();
    return {
        label: normalizeLabel(location.name),
        excerpt: normalizeExcerpt(location.description),
        ownerId: asObjectId(location.createdBy),
        contextId: null,
        targetUpdatedAt: location.updatedAt,
    };
};

const resolveReviewTarget = async (targetId: string): Promise<IReportTargetSnapshot> => {
    const review = await LocationReview.findOne({ _id: targetId, status: 'active' })
        .select({ locationId: 1, userId: 1, rating: 1, comment: 1, updatedAt: 1 })
        .lean();
    if (!review) return reportTargetNotFound();

    const location = await Location.findOne({ _id: review.locationId, status: 'approved' })
        .select({ name: 1 })
        .lean();
    if (!location) return reportTargetNotFound();

    return {
        label: normalizeLabel(`Đánh giá ${review.rating} sao tại ${location.name}`),
        excerpt: normalizeExcerpt(review.comment),
        ownerId: asObjectId(review.userId),
        contextId: asObjectId(review.locationId),
        targetUpdatedAt: review.updatedAt,
    };
};

const resolveItineraryTarget = async (targetId: string): Promise<IReportTargetSnapshot> => {
    const itinerary = await Itinerary.findOne({
        _id: targetId,
        visibility: 'public',
        status: 'active',
        isDeleted: false,
    })
        .select({ title: 1, description: 1, ownerId: 1, updatedAt: 1 })
        .lean();
    if (!itinerary) return reportTargetNotFound();
    return {
        label: normalizeLabel(itinerary.title),
        excerpt: normalizeExcerpt(itinerary.description),
        ownerId: asObjectId(itinerary.ownerId),
        contextId: null,
        targetUpdatedAt: itinerary.updatedAt,
    };
};

const resolveReportTarget = (targetType: ReportTargetType, targetId: string) => {
    if (targetType === 'location') return resolveLocationTarget(targetId);
    if (targetType === 'locationReview') return resolveReviewTarget(targetId);
    return resolveItineraryTarget(targetId);
};

const assertActiveReporter = async (reporterId: string) => {
    if (!mongoose.isValidObjectId(reporterId)) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
    }
    const reporter = await User.findById(reporterId).select({ status: 1 }).lean();
    if (!reporter) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (reporter.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }
    return reporter;
};

const assertActiveModerator = async (adminId: string) => {
    if (!mongoose.isValidObjectId(adminId)) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
    }
    const admin = await User.findById(adminId).select({ role: 1, status: 1 }).lean();
    if (!admin) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (admin.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }
    if (admin.role !== 'mod' && admin.role !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền xử lý báo cáo.');
    }
    return admin;
};

const valueId = (value: unknown): string => {
    if (value instanceof mongoose.Types.ObjectId) {
        return value.toString();
    }
    if (value && typeof value === 'object' && '_id' in value) {
        const nestedId = (value as { _id: unknown })._id;
        if (nestedId !== value) return valueId(nestedId);
    }
    return String(value);
};

const toReportPayload = (rawReport: unknown) => {
    const report = rawReport as ReportRecord;
    return {
        id: valueId(report._id),
        reporterId: valueId(report.reporterId),
        targetType: report.targetType,
        targetId: valueId(report.targetId),
        reasonCode: report.reasonCode,
        detail: report.detail,
        imageCount: (rawReport as ReportRecord).evidenceImages?.length ?? 0,
        status: report.status,
        targetSnapshot: {
            label: report.targetSnapshot.label,
            excerpt: report.targetSnapshot.excerpt,
            ownerId: valueId(report.targetSnapshot.ownerId),
            contextId: report.targetSnapshot.contextId === null
                ? null
                : valueId(report.targetSnapshot.contextId),
            targetUpdatedAt: report.targetSnapshot.targetUpdatedAt,
        },
        resolution: {
            handledBy: report.resolution?.handledBy ? valueId(report.resolution.handledBy) : null,
            handledAt: report.resolution?.handledAt ?? null,
            note: report.resolution?.note ?? null,
        },
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
};

const populatedReporter = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('_id' in value) || !('displayName' in value) || !('email' in value)) {
        return null;
    }
    const reporter = value as PopulatedReporter;
    return {
        id: valueId(reporter._id),
        displayName: reporter.displayName,
        email: reporter.email,
        avatarUrl: reporter.avatarUrl ?? null,
    };
};

const toAdminReportPayload = (rawReport: unknown, includeEvidenceImages = false) => ({
    ...toReportPayload(rawReport),
    reporter: populatedReporter((rawReport as ReportRecord).reporterId),
    imageCount: (rawReport as ReportRecord).evidenceImages?.length ?? 0,
    ...(includeEvidenceImages ? {
        evidenceImages: ((rawReport as ReportRecord).evidenceImages ?? [])
            .slice()
            .sort((left, right) => left.position - right.position)
            .map(({ url, position }) => ({ url, position })),
    } : {}),
});

const toCreatedReportPayload = (rawReport: unknown) => {
    const report = toReportPayload(rawReport);
    return {
        id: report.id,
        reporterId: report.reporterId,
        targetType: report.targetType,
        targetId: report.targetId,
        reasonCode: report.reasonCode,
        detail: report.detail,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
};

const isDuplicateKeyError = (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);

const duplicateReportError = (report?: { _id?: unknown; createdAt?: Date } | null): never => {
    const details: Record<string, unknown> = {};
    if (report?._id) details.reportId = valueId(report._id);
    if (report?.createdAt) details.createdAt = report.createdAt;
    throw new ApiError(
        409,
        'REPORT_ALREADY_EXISTS',
        'Bạn đã báo cáo nội dung này và báo cáo đang được xử lý.',
        details,
    );
};

export const createReport = async (input: unknown, reporterId: string) => {
    const body = assertBody<CreateReportBody>(input, CREATE_FIELDS);
    const targetType = normalizeTargetType(body.targetType);
    const targetId = normalizeObjectId(body.targetId, 'targetId');
    const reasonCode = normalizeReasonCode(body.reasonCode);
    const detail = normalizeDetail(body.detail, reasonCode);
    const imageAssetTokens = normalizeImageAssetTokens(body.imageAssetTokens);

    await assertActiveReporter(reporterId);
    const targetSnapshot = await resolveReportTarget(targetType, targetId);
    if (targetSnapshot.ownerId.equals(reporterId)) {
        throw new ApiError(403, 'CANNOT_REPORT_OWN_CONTENT', 'Bạn không thể báo cáo nội dung của chính mình.');
    }

    const duplicateFilter = { reporterId, targetType, targetId, status: 'pending' as const };
    const existingReport = await Report.findOne(duplicateFilter)
        .select({ _id: 1, createdAt: 1 })
        .lean();
    if (existingReport) return duplicateReportError(existingReport);

    const evidenceImages = resolveEvidenceImages(imageAssetTokens, reporterId);

    try {
        const report = await Report.create({
            reporterId,
            targetType,
            targetId,
            reasonCode,
            detail,
            status: 'pending',
            targetSnapshot,
            resolution: { handledBy: null, handledAt: null, note: null },
            evidenceImages,
        });
        return toCreatedReportPayload(report);
    } catch (error) {
        if (isDuplicateKeyError(error)) return duplicateReportError();
        throw error;
    }
};

const positiveInteger = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || (maximum !== undefined && parsed > maximum)) {
        return validationError('Thông tin phân trang không hợp lệ.');
    }
    return parsed;
};

const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildAdminReportFilter = (query: AdminReportQuery): Record<string, unknown> => {
    const status = (query.status ?? 'pending').trim();
    if (!ADMIN_REPORT_STATUSES.includes(status as ReportStatus)) {
        return validationError('Trạng thái báo cáo không hợp lệ.');
    }
    const filter: Record<string, unknown> = { status };

    if (query.targetType !== undefined) {
        filter.targetType = normalizeTargetType(query.targetType.trim());
    }
    if (query.reasonCode !== undefined) {
        filter.reasonCode = normalizeReasonCode(query.reasonCode.trim());
    }
    if (query.q !== undefined) {
        const q = query.q.trim();
        if (q.length > 200) return validationError('Từ khóa tìm kiếm không được vượt quá 200 ký tự.');
        if (q) {
            const pattern = new RegExp(escapeRegularExpression(q), 'i');
            filter.$or = [
                { detail: pattern },
                { 'targetSnapshot.label': pattern },
                { 'targetSnapshot.excerpt': pattern },
            ];
        }
    }
    return filter;
};

export const getAdminReports = async (query: AdminReportQuery = {}, adminId: string) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 20, 100);
    const filter = buildAdminReportFilter(query);
    await assertActiveModerator(adminId);
    const [reports, total] = await Promise.all([
        Report.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate('reporterId', 'displayName email avatarUrl')
            .lean(),
        Report.countDocuments(filter),
    ]);
    return {
        data: reports.map((report) => toAdminReportPayload(report)),
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
};

const normalizeReportId = (reportId: string) => {
    if (!mongoose.isValidObjectId(reportId)) {
        throw new ApiError(404, 'REPORT_NOT_FOUND', 'Không tìm thấy báo cáo.');
    }
    return reportId;
};

export const getAdminReportById = async (reportId: string, adminId: string) => {
    const normalizedReportId = normalizeReportId(reportId);
    await assertActiveModerator(adminId);
    const report = await Report.findById(normalizedReportId)
        .populate('reporterId', 'displayName email avatarUrl')
        .lean();
    if (!report) {
        throw new ApiError(404, 'REPORT_NOT_FOUND', 'Không tìm thấy báo cáo.');
    }
    return toAdminReportPayload(report, true);
};

const parseExpectedUpdatedAt = (value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return validationError('expectedUpdatedAt là thông tin bắt buộc.');
    }
    const result = new Date(value);
    if (Number.isNaN(result.getTime())) return validationError('expectedUpdatedAt không hợp lệ.');
    return result;
};

const parseResolutionNote = (value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return validationError('Ghi chú xử lý là thông tin bắt buộc.');
    }
    const result = value.trim();
    if (result.length > 1000) return validationError('Ghi chú xử lý không được vượt quá 1000 ký tự.');
    return result;
};

const throwReportConflict = async (reportId: string): Promise<never> => {
    const current = await Report.findById(reportId).select({ status: 1, updatedAt: 1 }).lean();
    if (!current) {
        throw new ApiError(404, 'REPORT_NOT_FOUND', 'Không tìm thấy báo cáo.');
    }
    throw new ApiError(
        409,
        'STALE_RESOURCE',
        'Báo cáo đã được thay đổi hoặc xử lý. Vui lòng tải lại.',
        { currentStatus: current.status, currentUpdatedAt: current.updatedAt },
    );
};

export const updateAdminReportStatus = async (reportId: string, input: unknown, adminId: string) => {
    const normalizedReportId = normalizeReportId(reportId);
    const body = assertBody<UpdateReportStatusBody>(input, UPDATE_STATUS_FIELDS);
    if (body.status !== 'resolved' && body.status !== 'dismissed') {
        return validationError('status phải là resolved hoặc dismissed.');
    }
    const resolutionNote = parseResolutionNote(body.resolutionNote);
    const expectedUpdatedAt = parseExpectedUpdatedAt(body.expectedUpdatedAt);
    const admin = await assertActiveModerator(adminId);
    const handledAt = new Date();

    const report = await Report.findOneAndUpdate(
        { _id: normalizedReportId, status: 'pending', updatedAt: expectedUpdatedAt },
        {
            $set: {
                status: body.status,
                'resolution.handledBy': admin._id,
                'resolution.handledAt': handledAt,
                'resolution.note': resolutionNote,
                updatedAt: handledAt,
            },
        },
        { new: true, runValidators: true },
    ).populate('reporterId', 'displayName email avatarUrl');
    if (!report) return throwReportConflict(normalizedReportId);
    return toAdminReportPayload(report, true);
};
