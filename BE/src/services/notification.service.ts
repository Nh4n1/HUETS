import mongoose from 'mongoose';
import Notification from '../models/notification.model.ts';
import type { NotificationType } from '../models/notification.model.ts';
import { ApiError } from '../utils/apiError.ts';

export const NOTIFICATION_LIST_LIMIT = 20;
export const NOTIFICATION_TTL_DAYS = 90;

interface CreateLocationNotificationInput {
    userId: string | mongoose.Types.ObjectId;
    locationId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    locationName: string;
    reason?: string | null;
}

const notificationText = ({
    type,
    locationName,
    reason,
}: Pick<CreateLocationNotificationInput, 'type' | 'locationName' | 'reason'>) => {
    switch (type) {
        case 'LOCATION_APPROVED':
            return {
                title: 'Địa điểm đã được duyệt',
                message: `"${locationName}" hiện đã được công khai.`,
            };
        case 'LOCATION_REJECTED':
            return {
                title: 'Địa điểm chưa được duyệt',
                message: `"${locationName}" chưa được duyệt. Lý do: ${reason ?? 'Không có lý do cụ thể.'}`,
            };
        case 'LOCATION_HIDDEN':
            return {
                title: 'Địa điểm đã bị ẩn',
                message: `"${locationName}" đã bị ẩn. Lý do: ${reason ?? 'Không có lý do cụ thể.'}`,
            };
        case 'LOCATION_RESTORED':
            return {
                title: 'Địa điểm đã được khôi phục',
                message: `"${locationName}" đã được hiển thị công khai trở lại.`,
            };
    }
};

const expiresInDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1_000);

const toPublicNotification = (notification: {
    _id: mongoose.Types.ObjectId;
    type: NotificationType;
    locationId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}) => ({
    id: notification._id.toString(),
    type: notification.type,
    locationId: notification.locationId.toString(),
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
});

export const createLocationNotification = async (input: CreateLocationNotificationInput) => {
    const text = notificationText(input);
    return Notification.create({
        userId: input.userId,
        locationId: input.locationId,
        type: input.type,
        ...text,
        isRead: false,
        expiresAt: expiresInDays(NOTIFICATION_TTL_DAYS),
    });
};

export const safeCreateLocationNotification = async (input: CreateLocationNotificationInput) => {
    try {
        return await createLocationNotification(input);
    } catch (error) {
        console.error('[notification] create failed', error);
        return null;
    }
};

export const getMyNotifications = async (userId: string) => {
    const [notifications, unreadCount] = await Promise.all([
        Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(NOTIFICATION_LIST_LIMIT)
            .lean(),
        Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
        data: notifications.map(toPublicNotification),
        unreadCount,
    };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
    if (!mongoose.isValidObjectId(notificationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy thông báo.');
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { isRead: true } },
        { new: true },
    );
    if (!notification) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy thông báo.');
    }

    return { id: notification._id.toString(), isRead: notification.isRead };
};

export const markAllNotificationsRead = async (userId: string) => {
    const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } },
    );
    return { updatedCount: result.modifiedCount };
};
