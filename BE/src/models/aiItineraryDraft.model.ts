import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type DraftTransport = 'walking' | 'motorbike' | 'car';
export type DraftPace = 'relaxed' | 'balanced' | 'active';
export type DraftOriginType = 'current_location' | 'map_point' | 'location_reference';

export interface IDraftDailyTimeRange {
    start: string;
    end: string;
}

export interface IDraftOrigin {
    type: DraftOriginType;
    coordinates: [number, number] | null;
    locationId: Types.ObjectId | null;
}

export interface IDraftRequest {
    durationDays: number;
    startDate: Date | null;
    dailyTimeRange: IDraftDailyTimeRange;
    transport: DraftTransport;
    pace: DraftPace;
    origin: IDraftOrigin;
    mustVisitLocationIds: Types.ObjectId[];
    preferenceText: string;
}

export interface IDraftContent {
    title: string;
    warnings: string[];
    days: Record<string, unknown>[];
}

export interface IAiItineraryDraft extends Document {
    userId: Types.ObjectId;
    request: IDraftRequest;
    draft: IDraftContent;
    createdAt: Date;
    expiresAt: Date;
}

const draftDailyTimeRangeSchema = new Schema<IDraftDailyTimeRange>(
    {
        start: { type: String, required: true },
        end: { type: String, required: true },
    },
    { _id: false },
);

const draftOriginSchema = new Schema<IDraftOrigin>(
    {
        type: { type: String, enum: ['current_location', 'map_point', 'location_reference'], required: true },
        coordinates: { type: [Number], default: null },
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    },
    { _id: false },
);

const draftRequestSchema = new Schema<IDraftRequest>(
    {
        durationDays: { type: Number, required: true },
        startDate: { type: Date, default: null },
        dailyTimeRange: { type: draftDailyTimeRangeSchema, required: true },
        transport: { type: String, enum: ['walking', 'motorbike', 'car'], required: true },
        pace: { type: String, enum: ['relaxed', 'balanced', 'active'], required: true },
        origin: { type: draftOriginSchema, required: true },
        mustVisitLocationIds: { type: [Schema.Types.ObjectId], default: [] },
        preferenceText: { type: String, default: '' },
    },
    { _id: false },
);

const draftContentSchema = new Schema<IDraftContent>(
    {
        title: { type: String, required: true },
        warnings: { type: [String], default: [] },
        days: { type: [Schema.Types.Mixed] as unknown as Record<string, unknown>[], default: [] },
    },
    { _id: false },
);

const aiItineraryDraftSchema = new Schema<IAiItineraryDraft>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        request: { type: draftRequestSchema, required: true },
        draft: { type: draftContentSchema, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'ai_itinerary_drafts' },
);

aiItineraryDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAiItineraryDraft>('AiItineraryDraft', aiItineraryDraftSchema);
