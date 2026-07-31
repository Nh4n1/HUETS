import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type ReportTargetType = 'location' | 'review' | 'itinerary';
export type ReportReason =
    | 'incorrect_information'
    | 'spam'
    | 'inappropriate_content'
    | 'misleading_content'
    | 'other'
    | 'contributor_removal_request';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface IReportTarget {
    type: ReportTargetType;
    id: Types.ObjectId;
}

export interface IReportResolution {
    handledBy: Types.ObjectId | null;
    handledAt: Date | null;
    note: string | null;
}

export interface IReport extends Document {
    reporterId: Types.ObjectId;
    target: IReportTarget;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    resolution: IReportResolution;
    createdAt: Date;
    updatedAt: Date;
}

const reportTargetSchema = new Schema<IReportTarget>(
    {
        type: { type: String, enum: ['location', 'review', 'itinerary'], required: true },
        id: { type: Schema.Types.ObjectId, required: true },
    },
    { _id: false },
);

const reportResolutionSchema = new Schema<IReportResolution>(
    {
        handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        handledAt: { type: Date, default: null },
        note: { type: String, default: null },
    },
    { _id: false },
);

const reportSchema = new Schema<IReport>(
    {
        reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        target: { type: reportTargetSchema, required: true },
        reason: {
            type: String,
            enum: [
                'incorrect_information',
                'spam',
                'inappropriate_content',
                'misleading_content',
                'other',
                'contributor_removal_request',
            ],
            required: true,
        },
        description: { type: String, default: null },
        status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
        resolution: { type: reportResolutionSchema, default: () => ({}) },
    },
    { timestamps: true, collection: 'reports' },
);

reportSchema.index({ status: 1, createdAt: 1 });
reportSchema.index({ 'target.type': 1, 'target.id': 1 });
reportSchema.index(
    { reporterId: 1, 'target.type': 1, 'target.id': 1, reason: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } },
);

export default mongoose.model<IReport>('Report', reportSchema);
