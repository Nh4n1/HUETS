import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type BookmarkTargetType = 'location' | 'itinerary';

export interface IBookmark extends Document {
    userId: Types.ObjectId;
    targetType: BookmarkTargetType;
    targetId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        targetType: { type: String, enum: ['location', 'itinerary'], required: true },
        targetId: { type: Schema.Types.ObjectId, required: true },
    },
    { timestamps: true, collection: 'bookmarks' },
);

bookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });
bookmarkSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model<IBookmark>('Bookmark', bookmarkSchema);
