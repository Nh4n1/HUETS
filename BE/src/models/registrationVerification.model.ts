import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export interface IRegistrationVerification extends Document {
    email: string;
    normalizedEmail: string;
    displayName: string;
    passwordHash: string;
    otp: string;
    verifyAttemptCount: number;
    resendCount: number;
    lastSentAt: Date;
    resendAvailableAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const registrationVerificationSchema = new Schema<IRegistrationVerification>(
    {
        email: { type: String, required: true, trim: true },
        normalizedEmail: { type: String, required: true, trim: true },
        displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
        passwordHash: { type: String, required: true },
        otp: { type: String, required: true, match: /^\d{6}$/ },
        verifyAttemptCount: { type: Number, required: true, default: 0, min: 0 },
        resendCount: { type: Number, required: true, default: 0, min: 0 },
        lastSentAt: { type: Date, required: true },
        resendAvailableAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true, collection: 'registration_verifications' },
);

registrationVerificationSchema.index({ normalizedEmail: 1 }, { unique: true });
registrationVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRegistrationVerification>(
    'RegistrationVerification',
    registrationVerificationSchema,
);
