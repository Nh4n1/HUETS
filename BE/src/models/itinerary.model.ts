import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type ItineraryVisibility = 'private' | 'public';
export type ItineraryStatus = 'active' | 'hidden';
export type RestoreDecision = 'approved' | 'rejected' | null;

export interface IItineraryItem {
    locationId: Types.ObjectId;
    order: number;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
    note: string | null;
}

export interface IItineraryDay {
    dayNumber: number;
    items: IItineraryItem[];
}

export interface IRestoreRequest {
    requested: boolean;
    requestedAt: Date | null;
    requestNote: string | null;
    handledBy: Types.ObjectId | null;
    handledAt: Date | null;
    lastDecision: RestoreDecision;
    decisionReason: string | null;
}

export interface IItineraryModeration {
    hiddenBy: Types.ObjectId | null;
    hiddenAt: Date | null;
    hiddenReason: string | null;
}

export interface IItinerary extends Document {
    ownerId: Types.ObjectId;
    title: string;
    description?: string;
    startDate: Date | null;
    visibility: ItineraryVisibility;
    status: ItineraryStatus;
    days: IItineraryDay[];
    restoreRequest: IRestoreRequest;
    moderation: IItineraryModeration;
    isDeleted: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export const MAX_ITINERARY_DAYS = 14;
export const MAX_ITEMS_PER_DAY = 20;

const itineraryItemSchema = new Schema<IItineraryItem>(
    {
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        order: { type: Number, required: true },
        startTime: { type: String, default: null },
        endTime: { type: String, default: null },
        durationMinutes: { type: Number, default: null },
        note: { type: String, default: null },
    },
);

const itineraryDaySchema = new Schema<IItineraryDay>(
    {
        dayNumber: { type: Number, required: true },
        items: {
            type: [itineraryItemSchema],
            default: [],
            validate: {
                validator: (items: IItineraryItem[]) => items.length <= MAX_ITEMS_PER_DAY,
                message: `A day cannot have more than ${MAX_ITEMS_PER_DAY} items`,
            },
        },
    },
    { _id: false },
);

const restoreRequestSchema = new Schema<IRestoreRequest>(
    {
        requested: { type: Boolean, default: false },
        requestedAt: { type: Date, default: null },
        requestNote: { type: String, default: null },
        handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        handledAt: { type: Date, default: null },
        lastDecision: { type: String, enum: ['approved', 'rejected', null], default: null },
        decisionReason: { type: String, default: null },
    },
    { _id: false },
);

const itineraryModerationSchema = new Schema<IItineraryModeration>(
    {
        hiddenBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        hiddenAt: { type: Date, default: null },
        hiddenReason: { type: String, default: null },
    },
    { _id: false },
);

const itinerarySchema = new Schema<IItinerary>(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        description: { type: String },
        startDate: { type: Date, default: null },
        visibility: { type: String, enum: ['private', 'public'], default: 'private' },
        status: { type: String, enum: ['active', 'hidden'], default: 'active' },
        days: {
            type: [itineraryDaySchema],
            default: [],
            validate: {
                validator: (days: IItineraryDay[]) => days.length <= MAX_ITINERARY_DAYS,
                message: `An itinerary cannot have more than ${MAX_ITINERARY_DAYS} days`,
            },
        },
        restoreRequest: { type: restoreRequestSchema, default: () => ({}) },
        moderation: { type: itineraryModerationSchema, default: () => ({}) },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'itineraries' },
);

itinerarySchema.index({ ownerId: 1, isDeleted: 1, updatedAt: -1 });
itinerarySchema.index({ visibility: 1, status: 1, isDeleted: 1, createdAt: -1 });
itinerarySchema.index({ 'days.items.locationId': 1 });

export default mongoose.model<IItinerary>('Itinerary', itinerarySchema);
