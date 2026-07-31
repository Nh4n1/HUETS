import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type ReviewStatus = 'visible' | 'hidden';

export interface IReviewModeration {
    hiddenBy: Types.ObjectId | null;
    hiddenAt: Date | null;
    hiddenReason: string | null;
}

export interface IReview extends Document {
    locationId: Types.ObjectId;
    userId: Types.ObjectId;
    rating: number;
    content: string;
    status: ReviewStatus;
    moderation: IReviewModeration;
    isDeleted: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const reviewModerationSchema = new Schema<IReviewModeration>(
    {
        hiddenBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        hiddenAt: { type: Date, default: null },
        hiddenReason: { type: String, default: null },
    },
    { _id: false },
);

const reviewSchema = new Schema<IReview>(
    {
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        content: { type: String, required: true, minlength: 10, maxlength: 1000 },
        status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
        moderation: { type: reviewModerationSchema, default: () => ({}) },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'reviews' },
);

reviewSchema.index(
    { userId: 1, locationId: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
);
reviewSchema.index({ locationId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IReview>('Review', reviewSchema);
