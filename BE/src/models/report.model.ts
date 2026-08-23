import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export const REPORT_TARGET_TYPES = ['location', 'locationReview', 'itinerary'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASON_CODES = ['spam', 'inappropriate', 'incorrect_info', 'offensive', 'other'] as const;
export type ReportReasonCode = (typeof REPORT_REASON_CODES)[number];

export const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface IReportTargetSnapshot {
    label: string;
    excerpt: string;
    ownerId: Types.ObjectId;
    contextId: Types.ObjectId | null;
    targetUpdatedAt: Date;
}

export interface IReportResolution {
    handledBy: Types.ObjectId | null;
    handledAt: Date | null;
    note: string | null;
}

export interface IReport extends Document {
    reporterId: Types.ObjectId;
    targetType: ReportTargetType;
    targetId: Types.ObjectId;
    reasonCode: ReportReasonCode;
    detail: string;
    status: ReportStatus;
    targetSnapshot: IReportTargetSnapshot;
    resolution: IReportResolution;
    createdAt: Date;
    updatedAt: Date;
}

const reportTargetSnapshotSchema = new Schema<IReportTargetSnapshot>(
    {
        label: { type: String, required: true, trim: true, maxlength: 200 },
        excerpt: { type: String, default: '', trim: true, maxlength: 1000 },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        contextId: { type: Schema.Types.ObjectId, default: null },
        targetUpdatedAt: { type: Date, required: true },
    },
    { _id: false },
);

const reportResolutionSchema = new Schema<IReportResolution>(
    {
        handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        handledAt: { type: Date, default: null },
        note: { type: String, default: null, trim: true, maxlength: 1000 },
    },
    { _id: false },
);

const reportSchema = new Schema<IReport>(
    {
        reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
        targetId: { type: Schema.Types.ObjectId, required: true },
        reasonCode: { type: String, enum: REPORT_REASON_CODES, required: true },
        detail: { type: String, default: '', trim: true, maxlength: 500 },
        status: { type: String, enum: REPORT_STATUSES, required: true, default: 'pending' },
        targetSnapshot: { type: reportTargetSnapshotSchema, required: true },
        resolution: { type: reportResolutionSchema, required: true, default: () => ({}) },
    },
    { timestamps: true, collection: 'reports' },
);

reportSchema.index(
    { reporterId: 1, targetType: 1, targetId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'pending' },
        name: 'unique_pending_report_per_reporter_target',
    },
);
reportSchema.index({ status: 1, createdAt: -1, _id: -1 });
reportSchema.index({ status: 1, targetType: 1, reasonCode: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });

export default mongoose.model<IReport>('Report', reportSchema);
