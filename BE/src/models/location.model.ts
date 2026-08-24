import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type LocationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'hidden';
export type OpeningHoursStatus = 'unknown' | 'always_open' | 'scheduled';

export interface ILocationAlias {
    value: string;
    normalizedValue: string;
}

export interface ILocationAddress {
    wardCode: string;
    wardNameSnapshot: string;
    addressLine: string;
    locationNote: string | null;
}

export interface ILocationGeo {
    type: 'Point';
    coordinates: [number, number];
}

export interface ILocationImage {
    _id: Types.ObjectId;
    url: string;
    publicId: string | null;
    position: number;
}

export interface IOpeningRange {
    open: string;
    close: string;
}

export interface IOpeningPeriod {
    dayOfWeek: number;
    ranges: IOpeningRange[];
}

export interface ILocationOpeningHours {
    status: OpeningHoursStatus;
    periods: IOpeningPeriod[];
}

export interface ILocationRatingSummary {
    average: number;
    count: number;
    distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface ILocationModeration {
    reviewedBy: Types.ObjectId | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    submittedAt: Date | null;
    withdrawnAt: Date | null;
    hiddenBy: Types.ObjectId | null;
    hiddenAt: Date | null;
    hiddenReason: string | null;
    restoredBy: Types.ObjectId | null;
    restoredAt: Date | null;
}

export interface ILocationEditSnapshot {
    name: string;
    description: string;
    categoryCode: string;
    tagCodes: string[];
    aliases: string[];
    address: {
        wardCode: string;
        wardNameSnapshot: string;
        addressLine: string;
        locationNote: string | null;
    };
    geo: {
        latitude: number;
        longitude: number;
    };
    images: Array<{
        url: string;
        position: number;
    }>;
    openingHours: ILocationOpeningHours;
}

export interface ILocationEditHistory {
    _id: Types.ObjectId;
    editedBy: Types.ObjectId;
    editedAt: Date;
    reason: string;
    changedFields: string[];
    before: ILocationEditSnapshot;
    after: ILocationEditSnapshot;
}

export interface ILocation extends Document {
    createdBy: Types.ObjectId;
    name: string;
    normalizedName: string;
    description: string;
    categoryCode: string;
    tagCodes: string[];
    aliases: ILocationAlias[];
    address: ILocationAddress;
    geo: ILocationGeo;
    images: Types.DocumentArray<ILocationImage>;
    openingHours: ILocationOpeningHours;
    ratingSummary: ILocationRatingSummary;
    status: LocationStatus;
    moderation: ILocationModeration;
    editHistory: Types.DocumentArray<ILocationEditHistory>;
    isDeleted: boolean;
    deletedAt: Date | null;
    deletedBy: Types.ObjectId | null;
    deletionReason: string | null;
    deletedFromStatus: LocationStatus | null;
    searchText: string;
    createdAt: Date;
    updatedAt: Date;
}

const locationAliasSchema = new Schema<ILocationAlias>(
    {
        value: { type: String, required: true, trim: true },
        normalizedValue: { type: String, required: true, trim: true },
    },
    { _id: false },
);

const locationAddressSchema = new Schema<ILocationAddress>(
    {
        wardCode: { type: String, required: true },
        wardNameSnapshot: { type: String, required: true },
        addressLine: { type: String, required: true, trim: true },
        locationNote: { type: String, default: null, trim: true },
    },
    { _id: false },
);

const locationGeoSchema = new Schema<ILocationGeo>(
    {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (coordinates: number[]) => coordinates.length === 2,
                message: 'GeoJSON Point must contain [longitude, latitude].',
            },
        },
    },
    { _id: false },
);

const locationImageSchema = new Schema<ILocationImage>({
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    position: { type: Number, required: true, min: 0 },
});

const openingRangeSchema = new Schema<IOpeningRange>(
    {
        open: { type: String, required: true },
        close: { type: String, required: true },
    },
    { _id: false },
);

const openingPeriodSchema = new Schema<IOpeningPeriod>(
    {
        dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
        ranges: { type: [openingRangeSchema], required: true, default: [] },
    },
    { _id: false },
);

const locationOpeningHoursSchema = new Schema<ILocationOpeningHours>(
    {
        status: { type: String, enum: ['unknown', 'always_open', 'scheduled'], required: true, default: 'unknown' },
        periods: { type: [openingPeriodSchema], required: true, default: [] },
    },
    { _id: false },
);

const locationRatingSummarySchema = new Schema<ILocationRatingSummary>(
    {
        average: { type: Number, required: true, default: 0, min: 0, max: 5 },
        count: { type: Number, required: true, default: 0, min: 0 },
        distribution: {
            type: new Schema(
                {
                    1: { type: Number, required: true, default: 0, min: 0 },
                    2: { type: Number, required: true, default: 0, min: 0 },
                    3: { type: Number, required: true, default: 0, min: 0 },
                    4: { type: Number, required: true, default: 0, min: 0 },
                    5: { type: Number, required: true, default: 0, min: 0 },
                },
                { _id: false },
            ),
            required: true,
            default: () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
        },
    },
    { _id: false },
);

const locationModerationSchema = new Schema<ILocationModeration>(
    {
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: null },
        submittedAt: { type: Date, default: null },
        withdrawnAt: { type: Date, default: null },
        hiddenBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        hiddenAt: { type: Date, default: null },
        hiddenReason: { type: String, default: null },
        restoredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        restoredAt: { type: Date, default: null },
    },
    { _id: false },
);

const locationEditHistorySchema = new Schema<ILocationEditHistory>(
    {
        editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        editedAt: { type: Date, required: true },
        reason: { type: String, required: true, trim: true, maxlength: 1000 },
        changedFields: { type: [String], required: true },
        before: { type: Schema.Types.Mixed, required: true },
        after: { type: Schema.Types.Mixed, required: true },
    },
    { _id: true },
);

const locationSchema = new Schema<ILocation>(
    {
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, trim: true },
        normalizedName: { type: String, required: true },
        description: { type: String, required: true, trim: true },
        categoryCode: { type: String, required: true },
        tagCodes: { type: [String], required: true, default: [] },
        aliases: { type: [locationAliasSchema], required: true, default: [] },
        address: { type: locationAddressSchema, required: true },
        geo: { type: locationGeoSchema, required: true },
        images: { type: [locationImageSchema], required: true },
        openingHours: { type: locationOpeningHoursSchema, required: true, default: () => ({ status: 'unknown', periods: [] }) },
        ratingSummary: {
            type: locationRatingSummarySchema,
            required: true,
            default: () => ({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }),
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'withdrawn', 'hidden'],
            required: true,
        },
        moderation: { type: locationModerationSchema, required: true, default: () => ({}) },
        editHistory: { type: [locationEditHistorySchema], required: true, default: [] },
        isDeleted: { type: Boolean, required: true, default: false },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        deletionReason: { type: String, default: null, trim: true, maxlength: 1000 },
        deletedFromStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'withdrawn', 'hidden'],
            default: null,
        },
        searchText: { type: String, required: true },
    },
    { timestamps: true, collection: 'locations' },
);

locationSchema.index({ isDeleted: 1, status: 1, categoryCode: 1, createdAt: -1 });
locationSchema.index({ status: 1, 'address.wardCode': 1 });
locationSchema.index({ status: 1, tagCodes: 1 });
locationSchema.index({ createdBy: 1, status: 1, updatedAt: -1 });
locationSchema.index({ normalizedName: 1 });
locationSchema.index({ 'aliases.normalizedValue': 1 });
locationSchema.index({ geo: '2dsphere' });
locationSchema.index({ searchText: 'text' });

export default mongoose.model<ILocation>('Location', locationSchema);
