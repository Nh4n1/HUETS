import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';
import { AI_ITINERARY_CONSTANTS } from '../config/aiItinerary.config.ts';

export type TransportType = 'motorcycle' | 'car' | 'walking' | 'bicycle';
export type PaceType = 'relaxed' | 'moderate' | 'fast';
export type OriginType = 'current_location' | 'map_point' | 'location_reference';

export interface IDraftOrigin {
    type: OriginType;
    coordinates?: [number, number];
    locationId?: Types.ObjectId;
}

export interface IDraftDailyTimeRange {
    start: string;
    end: string;
}

export interface IDraftPreferences {
    categoryCodes?: string[];
    requiredTagCodes?: string[];
    preferredTagCodes?: string[];
    avoidTagCodes?: string[];
    priceLevels?: number[];
}

export interface IDraftItem {
    locationId: Types.ObjectId;
    suggestedStartTime: string;
    durationMinutes: number;
    estimatedTravelMinutes?: number;
    note?: string;
}

export interface IDraftDay {
    dayNumber: number;
    items: IDraftItem[];
}

export interface IAIItineraryDraft extends Document {
    ownerId: Types.ObjectId;
    title: string;
    durationDays: number;
    startDate: Date | null;
    dailyTimeRange: IDraftDailyTimeRange;
    origin: IDraftOrigin;
    transport: TransportType;
    pace: PaceType;
    preferences: IDraftPreferences;
    normalizedPreferences?: IDraftPreferences;
    mustVisitLocationIds: Types.ObjectId[];
    preferenceText: string;
    days: IDraftDay[];
    warnings: string[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const draftOriginSchema = new Schema<IDraftOrigin>(
    {
        type: { type: String, enum: ['current_location', 'map_point', 'location_reference'], required: true },
        coordinates: { type: [Number], default: undefined },
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: undefined },
    },
    { _id: false },
);

const draftDailyTimeRangeSchema = new Schema<IDraftDailyTimeRange>(
    {
        start: { type: String, required: true, default: '08:00' },
        end: { type: String, required: true, default: '20:00' },
    },
    { _id: false },
);

const draftPreferencesSchema = new Schema<IDraftPreferences>(
    {
        categoryCodes: { type: [String], default: [] },
        requiredTagCodes: { type: [String], default: [] },
        preferredTagCodes: { type: [String], default: [] },
        avoidTagCodes: { type: [String], default: [] },
        priceLevels: { type: [Number], default: [] },
    },
    { _id: false },
);

const draftItemSchema = new Schema<IDraftItem>(
    {
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        suggestedStartTime: { type: String, required: true },
        durationMinutes: { type: Number, required: true, min: 1 },
        estimatedTravelMinutes: { type: Number, default: 0, min: 0 },
        note: { type: String, default: '', trim: true },
    },
    { _id: false },
);

const draftDaySchema = new Schema<IDraftDay>(
    {
        dayNumber: { type: Number, required: true, min: 1 },
        items: { type: [draftItemSchema], default: [] },
    },
    { _id: false },
);

const aiItineraryDraftSchema = new Schema<IAIItineraryDraft>(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true, trim: true, default: 'Hành trình AI' },
        durationDays: { type: Number, required: true, min: 1, max: AI_ITINERARY_CONSTANTS.MAX_ITINERARY_DAYS },
        startDate: { type: Date, default: null },
        dailyTimeRange: { type: draftDailyTimeRangeSchema, required: true },
        origin: { type: draftOriginSchema, required: true },
        transport: { type: String, enum: ['motorcycle', 'car', 'walking', 'bicycle'], required: true, default: 'motorcycle' },
        pace: { type: String, enum: ['relaxed', 'moderate', 'fast'], required: true, default: 'moderate' },
        preferences: { type: draftPreferencesSchema, required: true, default: () => ({}) },
        normalizedPreferences: { type: draftPreferencesSchema, default: undefined },
        mustVisitLocationIds: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
        preferenceText: { type: String, default: '', trim: true },
        days: { type: [draftDaySchema], default: [] },
        warnings: { type: [String], default: [] },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true, collection: 'ai_itinerary_drafts' },
);

aiItineraryDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
aiItineraryDraftSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model<IAIItineraryDraft>('AIItineraryDraft', aiItineraryDraftSchema);
