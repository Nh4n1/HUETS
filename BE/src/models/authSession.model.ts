import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IAuthSession extends Document {
    userId: Types.ObjectId;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
    expiresAt: Date;
}

const authSessionSchema = new Schema<IAuthSession>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        refreshTokenHash: { type: String, required: true },
        userAgent: { type: String },
        ipAddress: { type: String },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'auth_sessions' },
);

authSessionSchema.index({ userId: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAuthSession>('AuthSession', authSessionSchema);
