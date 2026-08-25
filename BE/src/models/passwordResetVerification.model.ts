import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IPasswordResetVerification extends Document {
    userId: Types.ObjectId;
    email: string;
    normalizedEmail: string;
    otp: string;
    verifyAttemptCount: number;
    resendCount: number;
    lastSentAt: Date;
    resendAvailableAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const passwordResetVerificationSchema = new Schema<IPasswordResetVerification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        email: { type: String, required: true, trim: true },
        normalizedEmail: { type: String, required: true, trim: true },
        otp: { type: String, required: true, match: /^\d{6}$/ },
        verifyAttemptCount: { type: Number, required: true, default: 0, min: 0 },
        resendCount: { type: Number, required: true, default: 0, min: 0 },
        lastSentAt: { type: Date, required: true },
        resendAvailableAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true, collection: 'password_reset_verifications' },
);

passwordResetVerificationSchema.index({ normalizedEmail: 1 }, { unique: true });
passwordResetVerificationSchema.index({ userId: 1 });
passwordResetVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPasswordResetVerification>(
    'PasswordResetVerification',
    passwordResetVerificationSchema,
);
