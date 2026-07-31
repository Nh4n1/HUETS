import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IPasswordResetToken extends Document {
    userId: Types.ObjectId;
    tokenHash: string;
    usedAt: Date | null;
    createdAt: Date;
    expiresAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        tokenHash: { type: String, required: true },
        usedAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'password_reset_tokens' },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPasswordResetToken>('PasswordResetToken', passwordResetTokenSchema);
