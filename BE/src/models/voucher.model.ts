import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type VoucherStatus = 'draft' | 'active' | 'paused' | 'ended';
export type VoucherBenefitType = 'percentage' | 'fixed_amount';

export interface IVoucherBenefit {
    type: VoucherBenefitType;
    value: number;
    maxDiscountAmount: number | null;
    minOrderAmount: number | null;
    currency: 'VND';
}

export interface IVoucher extends Document {
    locationId: Types.ObjectId;
    issuedByOwnershipId: Types.ObjectId;
    createdByUserId: Types.ObjectId;
    title: string;
    description: string;
    benefit: IVoucherBenefit;
    terms: string;
    claimStartAt: Date;
    claimEndAt: Date;
    redeemUntil: Date;
    totalQuantity: number;
    claimedCount: number;
    redeemedCount: number;
    status: VoucherStatus;
    publishedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const benefitSchema = new Schema<IVoucherBenefit>(
    {
        type: { type: String, enum: ['percentage', 'fixed_amount'], required: true },
        value: { type: Number, required: true, min: 1 },
        maxDiscountAmount: { type: Number, default: null, min: 0 },
        minOrderAmount: { type: Number, default: null, min: 0 },
        currency: { type: String, enum: ['VND'], required: true, default: 'VND' },
    },
    { _id: false },
);

const voucherSchema = new Schema<IVoucher>(
    {
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        issuedByOwnershipId: { type: Schema.Types.ObjectId, ref: 'LocationOwnership', required: true },
        createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
        description: { type: String, required: true, trim: true, maxlength: 300 },
        benefit: { type: benefitSchema, required: true },
        terms: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
        claimStartAt: { type: Date, required: true },
        claimEndAt: { type: Date, required: true },
        redeemUntil: { type: Date, required: true },
        totalQuantity: { type: Number, required: true, min: 1 },
        claimedCount: { type: Number, required: true, default: 0, min: 0 },
        redeemedCount: { type: Number, required: true, default: 0, min: 0 },
        status: { type: String, enum: ['draft', 'active', 'paused', 'ended'], required: true, default: 'draft' },
        publishedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'vouchers' },
);

voucherSchema.index({ locationId: 1, status: 1, claimEndAt: 1 });
voucherSchema.index({ issuedByOwnershipId: 1, createdAt: -1 });
voucherSchema.index({ status: 1, claimStartAt: 1, claimEndAt: 1 });

export default mongoose.model<IVoucher>('Voucher', voucherSchema);
