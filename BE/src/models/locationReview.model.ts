import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ILocationReview extends Document {
    locationId: Types.ObjectId;
    userId: Types.ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

const locationReviewSchema = new Schema<ILocationReview>(
    {
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: '', trim: true, maxlength: 1000 },
    },
    { timestamps: true, collection: 'location_reviews' },
);

locationReviewSchema.index({ locationId: 1, userId: 1 }, { unique: true });
locationReviewSchema.index({ locationId: 1, updatedAt: -1 });

export default mongoose.model<ILocationReview>('LocationReview', locationReviewSchema);
