import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type LocationOwnershipStatus = 'pending' | 'verified' | 'rejected' | 'revoked' | 'cancelled';
export type LocationOwnershipRelationship = 'owner' | 'authorized_representative' | 'authorized_manager';
export type LocationOwnershipReviewAction = 'submitted' | 'resubmitted' | 'approved' | 'rejected' | 'revoked' | 'cancelled';

export interface IOwnershipEvidenceImage {
    url: string;
    publicId: string | null;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
}

export interface IOwnershipReviewHistory {
    action: LocationOwnershipReviewAction;
    reasonCode: string | null;
    reason: string | null;
    actorId: Types.ObjectId;
    actedAt: Date;
}

export interface ILocationOwnership extends Document {
    userId: Types.ObjectId;
    locationId: Types.ObjectId;
    locationMode: 'existing' | 'new';
    status: LocationOwnershipStatus;
    relationship: LocationOwnershipRelationship;
    contactName: string;
    contactPhone: string | null;
    contactEmail: string | null;
    note: string;
    evidenceImages: Types.DocumentArray<IOwnershipEvidenceImage>;
    activeKey: string | null;
    submittedAt: Date;
    verifiedAt: Date | null;
    revokedAt: Date | null;
    reviewHistory: Types.DocumentArray<IOwnershipReviewHistory>;
    createdAt: Date;
    updatedAt: Date;
}

const evidenceImageSchema = new Schema<IOwnershipEvidenceImage>(
    {
        url: { type: String, required: true },
        publicId: { type: String, default: null },
        mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
        sizeBytes: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

const reviewHistorySchema = new Schema<IOwnershipReviewHistory>(
    {
        action: {
            type: String,
            enum: ['submitted', 'resubmitted', 'approved', 'rejected', 'revoked', 'cancelled'],
            required: true,
        },
        reasonCode: { type: String, default: null, trim: true },
        reason: { type: String, default: null, trim: true, maxlength: 2000 },
        actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        actedAt: { type: Date, required: true },
    },
    { _id: false },
);

const locationOwnershipSchema = new Schema<ILocationOwnership>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        locationMode: { type: String, enum: ['existing', 'new'], required: true },
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected', 'revoked', 'cancelled'],
            required: true,
            default: 'pending',
        },
        relationship: {
            type: String,
            enum: ['owner', 'authorized_representative', 'authorized_manager'],
            required: true,
        },
        contactName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
        contactPhone: { type: String, default: null, trim: true, maxlength: 30 },
        contactEmail: { type: String, default: null, trim: true, lowercase: true, maxlength: 254 },
        note: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
        evidenceImages: { type: [evidenceImageSchema], required: true },
        activeKey: { type: String, default: null },
        submittedAt: { type: Date, required: true },
        verifiedAt: { type: Date, default: null },
        revokedAt: { type: Date, default: null },
        reviewHistory: { type: [reviewHistorySchema], required: true, default: [] },
    },
    { timestamps: true, collection: 'location_ownerships' },
);

// One pending/verified request per User–Location. Inactive records keep history
// without occupying the sparse key, so a revoked/cancelled request can be replaced.
locationOwnershipSchema.index({ activeKey: 1 }, { unique: true, sparse: true });
locationOwnershipSchema.index(
    { locationId: 1 },
    { unique: true, partialFilterExpression: { status: 'verified' } },
);
locationOwnershipSchema.index({ userId: 1, status: 1, updatedAt: -1 });
locationOwnershipSchema.index({ status: 1, submittedAt: 1 });
locationOwnershipSchema.index({ locationId: 1, createdAt: -1 });

export const ownershipActiveKey = (userId: string, locationId: string) => `${userId}:${locationId}`;

export default mongoose.model<ILocationOwnership>('LocationOwnership', locationOwnershipSchema);
