import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'locked';

export interface IUser extends Document {
    email: string;
    normalizedEmail: string;
    passwordHash: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    role: UserRole;
    status: UserStatus;
    lockReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, trim: true },
        normalizedEmail: { type: String, required: true, trim: true },
        passwordHash: { type: String, required: true },
        displayName: { type: String, required: true, trim: true },
        avatarUrl: { type: String },
        bio: { type: String },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
                status: { type: String, enum: ['active', 'locked'], default: 'active' },
        lockReason: { type: String, default: null },
    },
    { timestamps: true, collection: 'users' },
);

userSchema.index({ normalizedEmail: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });

export default mongoose.model<IUser>('User', userSchema);
