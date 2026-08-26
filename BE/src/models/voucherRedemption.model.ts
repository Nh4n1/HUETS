import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IVoucherRedemption extends Document {
    voucherClaimId: Types.ObjectId;
    voucherId: Types.ObjectId;
    locationId: Types.ObjectId;
    userId: Types.ObjectId;
    ownershipId: Types.ObjectId;
    redeemedByDeviceId: Types.ObjectId;
    method: 'qr' | 'code';
    redeemedAt: Date;
    voucherSnapshot: unknown;
    transactionCode: string;
}

const schema = new Schema<IVoucherRedemption>({
    voucherClaimId: { type: Schema.Types.ObjectId, ref: 'VoucherClaim', required: true, unique: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownershipId: { type: Schema.Types.ObjectId, ref: 'LocationOwnership', required: true },
    redeemedByDeviceId: { type: Schema.Types.ObjectId, ref: 'RedemptionDevice', required: true },
    method: { type: String, enum: ['qr', 'code'], required: true },
    redeemedAt: { type: Date, required: true },
    voucherSnapshot: { type: Schema.Types.Mixed, required: true },
    transactionCode: { type: String, required: true, unique: true },
}, { versionKey: false, collection: 'voucher_redemptions' });

schema.index({ locationId: 1, redeemedAt: -1 });
schema.index({ redeemedByDeviceId: 1, redeemedAt: -1 });

export default mongoose.model<IVoucherRedemption>('VoucherRedemption', schema);
