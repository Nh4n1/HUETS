import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IAiItineraryDraft extends Document {
    userId: Types.ObjectId;
    request: {
        durationDays: number;
        startDate: string | null;
        dailyTimeRange: { start: string; end: string };
        pace: 'relaxed' | 'balanced' | 'active';
        preferences: { preferredCategoryCodes: string[]; preferredTagCodes: string[] };
        mustVisitLocationIds: Types.ObjectId[];
    };
    candidateLocationIds: Types.ObjectId[];
    draft: {
        title: string;
        warnings: string[];
        days: Array<{
            dayNumber: number;
            items: Types.DocumentArray<{
                _id: Types.ObjectId;
                locationId: Types.ObjectId;
                suggestedStartTime: string;
                durationMinutes: number;
                note: string | null;
            }>;
        }>;
    };
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const aiDraftItemSchema = new Schema({
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    suggestedStartTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    note: { type: String, default: null },
});

const aiDraftDaySchema = new Schema({
    dayNumber: { type: Number, required: true, min: 1 },
    items: { type: [aiDraftItemSchema], required: true, default: [] },
}, { _id: false });

const aiItineraryDraftSchema = new Schema<IAiItineraryDraft>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    request: {
        durationDays: { type: Number, required: true },
        startDate: { type: String, default: null },
        dailyTimeRange: {
            start: { type: String, required: true },
            end: { type: String, required: true },
        },
        pace: { type: String, enum: ['relaxed', 'balanced', 'active'], required: true },
        preferences: {
            preferredCategoryCodes: { type: [String], required: true, default: [] },
            preferredTagCodes: { type: [String], required: true, default: [] },
        },
        mustVisitLocationIds: { type: [Schema.Types.ObjectId], required: true, default: [] },
    },
    candidateLocationIds: { type: [Schema.Types.ObjectId], required: true, default: [] },
    draft: {
        title: { type: String, required: true, trim: true },
        warnings: { type: [String], required: true, default: [] },
        days: { type: [aiDraftDaySchema], required: true, default: [] },
    },
    expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: 'ai_itinerary_drafts' });

aiItineraryDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
aiItineraryDraftSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IAiItineraryDraft>('AiItineraryDraft', aiItineraryDraftSchema);
