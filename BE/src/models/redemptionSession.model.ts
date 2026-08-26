import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IRedemptionSession extends Document {
    voucherClaimId: Types.ObjectId;
    userId: Types.ObjectId;
    tokenHash: string;
    displayCodeHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
    createdAt: Date;
}

const schema = new Schema<IRedemptionSession>({
    voucherClaimId: { type: Schema.Types.ObjectId, ref: 'VoucherClaim', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    displayCodeHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'redemption_sessions' });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ voucherClaimId: 1, expiresAt: -1 });

export default mongoose.model<IRedemptionSession>('RedemptionSession', schema);
