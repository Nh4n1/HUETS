import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IDeviceActivationCode extends Document {
    codeHash: string;
    locationId: Types.ObjectId;
    ownershipId: Types.ObjectId;
    createdByUserId: Types.ObjectId;
    suggestedDeviceName: string;
    expiresAt: Date;
    consumedAt: Date | null;
    failedAttempts: number;
    createdAt: Date;
}

const schema = new Schema<IDeviceActivationCode>({
    codeHash: { type: String, required: true, unique: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    ownershipId: { type: Schema.Types.ObjectId, ref: 'LocationOwnership', required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    suggestedDeviceName: { type: String, required: true, trim: true, maxlength: 100 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    failedAttempts: { type: Number, required: true, default: 0 },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'device_activation_codes' });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ ownershipId: 1, createdAt: -1 });

export default mongoose.model<IDeviceActivationCode>('DeviceActivationCode', schema);
