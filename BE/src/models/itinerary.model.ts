import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export const MAX_ITINERARY_DAYS = 14;
export const MAX_ITEMS_PER_DAY = 20;

export type ItineraryVisibility = 'private' | 'public';
export type ItineraryStatus = 'active' | 'hidden';
export type RestoreRequestDecision = 'approved' | 'rejected';

export interface IItineraryItem {
    _id: Types.ObjectId;
    locationId: Types.ObjectId;
    order: number;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
    note: string | null;
}

export interface IItineraryDay {
    dayNumber: number;
    items: Types.DocumentArray<IItineraryItem>;
}

export interface IRestoreRequest {
    requested: boolean;
    requestedAt: Date | null;
    requestNote: string | null;
    handledBy: Types.ObjectId | null;
    handledAt: Date | null;
    lastDecision: RestoreRequestDecision | null;
    decisionReason: string | null;
}

export interface IItineraryModeration {
    hiddenBy: Types.ObjectId | null;
    hiddenAt: Date | null;
    hiddenReason: string | null;
    restoredBy: Types.ObjectId | null;
    restoredAt: Date | null;
}

export interface IItinerary extends Document {
    ownerId: Types.ObjectId;
    title: string;
    description: string;
    startDate: Date | null;
    visibility: ItineraryVisibility;
    status: ItineraryStatus;
    days: Types.DocumentArray<IItineraryDay>;
    restoreRequest: IRestoreRequest;
    moderation: IItineraryModeration;
    isDeleted: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const itineraryItemSchema = new Schema<IItineraryItem>({
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    order: { type: Number, required: true, min: 1 },
    startTime: { type: String, default: null, match: timePattern },
    endTime: { type: String, default: null, match: timePattern },
    durationMinutes: { type: Number, default: null, min: 1 },
    note: { type: String, default: null, trim: true },
});

const itineraryDaySchema = new Schema<IItineraryDay>(
    {
        dayNumber: { type: Number, required: true, min: 1 },
        items: {
            type: [itineraryItemSchema],
            required: true,
            default: [],
            validate: {
                validator: (items: IItineraryItem[]) => items.length <= MAX_ITEMS_PER_DAY,
                message: `An itinerary day cannot contain more than ${MAX_ITEMS_PER_DAY} items.`,
            },
        },
    },
    { _id: false },
);

const restoreRequestSchema = new Schema<IRestoreRequest>(
    {
        requested: { type: Boolean, required: true, default: false },
        requestedAt: { type: Date, default: null },
        requestNote: { type: String, default: null, trim: true },
        handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        handledAt: { type: Date, default: null },
        lastDecision: { type: String, enum: ['approved', 'rejected'], default: null },
        decisionReason: { type: String, default: null, trim: true },
    },
    { _id: false },
);

const itineraryModerationSchema = new Schema<IItineraryModeration>(
    {
        hiddenBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        hiddenAt: { type: Date, default: null },
        hiddenReason: { type: String, default: null, trim: true },
        restoredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        restoredAt: { type: Date, default: null },
    },
    { _id: false },
);

const itinerarySchema = new Schema<IItinerary>(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '', trim: true },
        startDate: { type: Date, default: null },
        visibility: { type: String, enum: ['private', 'public'], required: true, default: 'private' },
        status: { type: String, enum: ['active', 'hidden'], required: true, default: 'active' },
        days: {
            type: [itineraryDaySchema],
            required: true,
            default: [],
            validate: {
                validator: (days: IItineraryDay[]) => days.length <= MAX_ITINERARY_DAYS,
                message: `An itinerary cannot contain more than ${MAX_ITINERARY_DAYS} days.`,
            },
        },
        restoreRequest: { type: restoreRequestSchema, required: true, default: () => ({}) },
        moderation: { type: itineraryModerationSchema, required: true, default: () => ({}) },
        isDeleted: { type: Boolean, required: true, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'itineraries' },
);

itinerarySchema.index({ ownerId: 1, isDeleted: 1, updatedAt: -1 });
itinerarySchema.index({ visibility: 1, status: 1, isDeleted: 1, createdAt: -1 });
itinerarySchema.index({ 'days.items.locationId': 1 });

export default mongoose.model<IItinerary>('Itinerary', itinerarySchema);
