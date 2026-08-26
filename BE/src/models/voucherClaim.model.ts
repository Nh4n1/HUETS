import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';
import type { IVoucherBenefit } from './voucher.model.ts';

export type VoucherClaimStatus = 'available' | 'used';

export interface IVoucherLocationSnapshot {
    name: string;
    formattedAddress: string;
    coverImageUrl: string | null;
}

export interface IVoucherClaim extends Document {
    voucherId: Types.ObjectId;
    userId: Types.ObjectId;
    locationId: Types.ObjectId;
    issuedByOwnershipId: Types.ObjectId;
    status: VoucherClaimStatus;
    claimedAt: Date;
    redeemUntil: Date;
    benefitSnapshot: IVoucherBenefit;
    termsSnapshot: string;
    voucherTitleSnapshot: string;
    voucherDescriptionSnapshot: string;
    locationSnapshot: IVoucherLocationSnapshot;
    usedAt: Date | null;
    redemptionId: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const voucherClaimSchema = new Schema<IVoucherClaim>(
    {
        voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        issuedByOwnershipId: { type: Schema.Types.ObjectId, ref: 'LocationOwnership', required: true },
        status: { type: String, enum: ['available', 'used'], required: true, default: 'available' },
        claimedAt: { type: Date, required: true },
        redeemUntil: { type: Date, required: true },
        benefitSnapshot: { type: Schema.Types.Mixed, required: true },
        termsSnapshot: { type: String, required: true },
        voucherTitleSnapshot: { type: String, required: true },
        voucherDescriptionSnapshot: { type: String, required: true },
        locationSnapshot: { type: Schema.Types.Mixed, required: true },
        usedAt: { type: Date, default: null },
        redemptionId: { type: Schema.Types.ObjectId, ref: 'VoucherRedemption', default: null },
    },
    { timestamps: true, collection: 'voucher_claims' },
);

voucherClaimSchema.index({ voucherId: 1, userId: 1 }, { unique: true });
voucherClaimSchema.index({ userId: 1, status: 1, redeemUntil: 1 });
voucherClaimSchema.index({ voucherId: 1, claimedAt: -1 });

export default mongoose.model<IVoucherClaim>('VoucherClaim', voucherClaimSchema);
