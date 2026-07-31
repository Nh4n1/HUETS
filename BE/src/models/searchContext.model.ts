import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ISearchContext extends Document {
    token: string;
    userId: Types.ObjectId | null;
    sessionId: string | null;
    criteria: Record<string, unknown>;
    status: 'waiting_context';
    createdAt: Date;
    expiresAt: Date;
}

const searchContextSchema = new Schema<ISearchContext>(
    {
        token: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        sessionId: { type: String, default: null },
        criteria: { type: Schema.Types.Mixed, required: true },
        status: { type: String, enum: ['waiting_context'], default: 'waiting_context' },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'search_contexts' },
);

searchContextSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISearchContext>('SearchContext', searchContextSchema);
