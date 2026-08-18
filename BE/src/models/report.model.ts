import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type ReportTargetType = 'location' | 'locationReview' | 'itinerary';
export type ReportReasonCode = 'spam' | 'inappropriate' | 'incorrect_info' | 'offensive' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface IReport extends Document {
    reporterId: Types.ObjectId;
    targetType: ReportTargetType;
    targetId: Types.ObjectId;
    reasonCode: ReportReasonCode;
    detail: string;
    status: ReportStatus;
    createdAt: Date;
    updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
    {
        reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        targetType: { type: String, enum: ['location', 'locationReview', 'itinerary'], required: true },
        targetId: { type: Schema.Types.ObjectId, required: true },
        reasonCode: {
            type: String,
            enum: ['spam', 'inappropriate', 'incorrect_info', 'offensive', 'other'],
            required: true,
        },
        detail: { type: String, default: '', trim: true, maxlength: 500 },
        status: { type: String, enum: ['pending', 'resolved', 'dismissed'], required: true, default: 'pending' },
    },
    { timestamps: true, collection: 'reports' },
);

// Một người dùng chỉ có 1 báo cáo "pending" cho cùng 1 target tại 1 thời điểm,
// tránh spam report nhưng vẫn cho báo cáo lại sau khi báo cáo cũ đã được xử lý.
reportSchema.index(
    { reporterId: 1, targetType: 1, targetId: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } },
);
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IReport>('Report', reportSchema);