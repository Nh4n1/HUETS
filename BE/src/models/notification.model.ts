import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
    'LOCATION_APPROVED',
    'LOCATION_REJECTED',
    'LOCATION_HIDDEN',
    'LOCATION_RESTORED',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface INotification extends Document {
    userId: Types.ObjectId;
    type: NotificationType;
    locationId: Types.ObjectId;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    expiresAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: NOTIFICATION_TYPES, required: true },
        locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        isRead: { type: Boolean, required: true, default: false },
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: 'notifications',
    },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<INotification>('Notification', notificationSchema);
