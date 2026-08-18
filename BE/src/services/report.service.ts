import mongoose from 'mongoose';
import Report from '../models/report.model.ts';
import { ApiError } from '../utils/apiError.ts';

export const SUPPORTED_TARGET_TYPES = ['location', 'locationReview', 'itinerary'] as const;
export type ReportTargetType = (typeof SUPPORTED_TARGET_TYPES)[number];

export const SUPPORTED_REASON_CODES = ['spam', 'inappropriate', 'incorrect_info', 'offensive', 'other'] as const;
export type ReportReasonCode = (typeof SUPPORTED_REASON_CODES)[number];

interface CreateReportInput {
    reporterId: string;
    targetType: unknown;
    targetId: unknown;
    reasonCode: unknown;
    detail: unknown;
}

const normalizeObjectId = (value: unknown, fieldName: string) => {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${fieldName} không hợp lệ.`);
    }
    return value;
};

const normalizeTargetType = (value: unknown): ReportTargetType => {
    if (typeof value !== 'string' || !SUPPORTED_TARGET_TYPES.includes(value as ReportTargetType)) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'targetType không hợp lệ. Chỉ hỗ trợ: location, locationReview, itinerary.',
        );
    }
    return value as ReportTargetType;
};

const normalizeReasonCode = (value: unknown): ReportReasonCode => {
    if (typeof value !== 'string' || !SUPPORTED_REASON_CODES.includes(value as ReportReasonCode)) {
        throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'reasonCode không hợp lệ. Chỉ hỗ trợ: spam, inappropriate, incorrect_info, offensive, other.',
        );
    }
    return value as ReportReasonCode;
};

const normalizeDetail = (value: unknown): string => {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    if (typeof value !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Nội dung mô tả không hợp lệ.');
    }
    const trimmedDetail = value.trim();
    if (trimmedDetail.length > 500) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Nội dung mô tả không được vượt quá 500 ký tự.');
    }
    return trimmedDetail;
};

const toReportPayload = (report: {
    _id: { toString: () => string };
    reporterId: { toString: () => string };
    targetType: ReportTargetType;
    targetId: { toString: () => string };
    reasonCode: ReportReasonCode;
    detail: string;
    status: string;
    createdAt: Date;
}) => ({
    id: report._id.toString(),
    reporterId: report.reporterId.toString(),
    targetType: report.targetType,
    targetId: report.targetId.toString(),
    reasonCode: report.reasonCode,
    detail: report.detail,
    status: report.status,
    createdAt: report.createdAt,
});

export const createReport = async ({ reporterId, targetType, targetId, reasonCode, detail }: CreateReportInput) => {
    const normalizedReporterId = normalizeObjectId(reporterId, 'reporterId');
    const normalizedTargetType = normalizeTargetType(targetType);
    const normalizedTargetId = normalizeObjectId(targetId, 'targetId');
    const normalizedReasonCode = normalizeReasonCode(reasonCode);
    const normalizedDetail = normalizeDetail(detail);

    const existedPendingReport = await Report.findOne({
        reporterId: normalizedReporterId,
        targetType: normalizedTargetType,
        targetId: normalizedTargetId,
        status: 'pending',
    });

    if (existedPendingReport) {
        throw new ApiError(
            409,
            'REPORT_ALREADY_EXISTS',
            'Bạn đã báo cáo nội dung này và báo cáo đang được xử lý.',
        );
    }

    const report = await Report.create({
        reporterId: normalizedReporterId,
        targetType: normalizedTargetType,
        targetId: normalizedTargetId,
        reasonCode: normalizedReasonCode,
        detail: normalizedDetail,
        status: 'pending',
    });

    return toReportPayload(report);
};