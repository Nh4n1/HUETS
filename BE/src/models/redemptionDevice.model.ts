import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IRedemptionDevice extends Document {
    locationId: Types.ObjectId;
    ownershipId: Types.ObjectId;
    name: string;
    sessionTokenHash: string;
    sessionExpiresAt: Date;
    status: 'active' | 'revoked';
    activatedAt: Date;
    lastSeenAt: Date;
    revokedAt: Date | null;
    revokedBy: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IRedemptionDevice>({
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    ownershipId: { type: Schema.Types.ObjectId, ref: 'LocationOwnership', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    sessionTokenHash: { type: String, required: true, unique: true },
    sessionExpiresAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'revoked'], required: true, default: 'active' },
    activatedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'redemption_devices' });

schema.index({ ownershipId: 1, status: 1 });
schema.index({ locationId: 1, status: 1 });

export default mongoose.model<IRedemptionDevice>('RedemptionDevice', schema);
