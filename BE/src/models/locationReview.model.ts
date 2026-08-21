import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type LocationReviewStatus = 'active' | 'deleted' | 'hidden';

export interface ILocationReview extends Document {
    locationId: Types.ObjectId;
    userId: Types.ObjectId;
    rating: number;
    comment: string;
    status: LocationReviewStatus;
    editedAt: Date | null;
    editCount: number;
    deletedAt: Date | null;
    hiddenAt: Date | null;
    hiddenBy: Types.ObjectId | null;
    hiddenReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const locationReviewSchema = new Schema<ILocationReview>(
    {
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: '', trim: true, maxlength: 1000 },
        status: { type: String, enum: ['active', 'deleted', 'hidden'], required: true, default: 'active' },
        editedAt: { type: Date, default: null },
        editCount: { type: Number, default: 0, min: 0 },
        deletedAt: { type: Date, default: null },
        hiddenAt: { type: Date, default: null },
        hiddenBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        hiddenReason: { type: String, default: null, trim: true, maxlength: 500 },
    },
    { timestamps: true, collection: 'location_reviews' },
);

locationReviewSchema.index({ locationId: 1, userId: 1 }, { unique: true });
locationReviewSchema.index({ locationId: 1, updatedAt: -1 });
locationReviewSchema.index({ locationId: 1, status: 1, updatedAt: -1 });
locationReviewSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.model<ILocationReview>('LocationReview', locationReviewSchema);
