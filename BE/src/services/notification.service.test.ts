import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Notification from '../models/notification.model.ts';
import { ApiError } from '../utils/apiError.ts';
import {
    createLocationNotification,
    getMyNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    NOTIFICATION_LIST_LIMIT,
    NOTIFICATION_TTL_DAYS,
    safeCreateLocationNotification,
} from './notification.service.ts';

const userId = new mongoose.Types.ObjectId();
const locationId = new mongoose.Types.ObjectId();
const notificationId = new mongoose.Types.ObjectId();

afterEach(() => vi.restoreAllMocks());

describe('notification service', () => {
    it.each([
        ['LOCATION_APPROVED', 'Địa điểm đã được duyệt', 'hiện đã được công khai'],
        ['LOCATION_REJECTED', 'Địa điểm chưa được duyệt', 'Lý do: Sai vị trí'],
        ['LOCATION_HIDDEN', 'Địa điểm đã bị ẩn', 'Lý do: Sai vị trí'],
        ['LOCATION_RESTORED', 'Địa điểm đã được khôi phục', 'hiển thị công khai trở lại'],
    ] as const)('creates %s text and a 90-day expiry', async (type, title, messagePart) => {
        const create = vi.spyOn(Notification, 'create').mockResolvedValue({ _id: notificationId } as never);
        const before = Date.now();

        await createLocationNotification({
            userId,
            locationId,
            type,
            locationName: 'Cafe Mộc',
            reason: 'Sai vị trí',
        });

        const payload = create.mock.calls[0]?.[0] as unknown as {
            title: string;
            message: string;
            expiresAt: Date;
        };
        expect(payload.title).toBe(title);
        expect(payload.message).toContain(messagePart);
        expect(payload.expiresAt.getTime()).toBeGreaterThanOrEqual(
            before + NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1_000,
        );
    });

    it('swallows notification insert failures', async () => {
        vi.spyOn(Notification, 'create').mockRejectedValue(new Error('database unavailable'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(safeCreateLocationNotification({
            userId,
            locationId,
            type: 'LOCATION_APPROVED',
            locationName: 'Cafe Mộc',
        })).resolves.toBeNull();
    });

    it('lists only the current user newest-first, limits to 20, and counts unread', async () => {
        const createdAt = new Date('2026-08-25T13:00:00.000Z');
        const lean = vi.fn().mockResolvedValue([{
            _id: notificationId,
            type: 'LOCATION_APPROVED',
            locationId,
            title: 'Địa điểm đã được duyệt',
            message: 'Thông báo',
            isRead: false,
            createdAt,
        }]);
        const limit = vi.fn().mockReturnValue({ lean });
        const sort = vi.fn().mockReturnValue({ limit });
        const find = vi.spyOn(Notification, 'find').mockReturnValue({ sort } as never);
        const count = vi.spyOn(Notification, 'countDocuments').mockResolvedValue(3);

        const result = await getMyNotifications(userId.toString());

        expect(find).toHaveBeenCalledWith({ userId: userId.toString() });
        expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(limit).toHaveBeenCalledWith(NOTIFICATION_LIST_LIMIT);
        expect(count).toHaveBeenCalledWith({ userId: userId.toString(), isRead: false });
        expect(result).toEqual({
            data: [expect.objectContaining({
                id: notificationId.toString(),
                locationId: locationId.toString(),
                isRead: false,
            })],
            unreadCount: 3,
        });
    });

    it('rejects invalid ids before querying MongoDB', async () => {
        const update = vi.spyOn(Notification, 'findOneAndUpdate');

        await expect(markNotificationRead(userId.toString(), 'invalid'))
            .rejects.toMatchObject<Partial<ApiError>>({ statusCode: 404, code: 'NOT_FOUND' });
        expect(update).not.toHaveBeenCalled();
    });

    it('marks one notification using an ownership filter', async () => {
        const update = vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue({
            _id: notificationId,
            isRead: true,
        } as never);

        await expect(markNotificationRead(userId.toString(), notificationId.toString())).resolves.toEqual({
            id: notificationId.toString(),
            isRead: true,
        });
        expect(update).toHaveBeenCalledWith(
            { _id: notificationId.toString(), userId: userId.toString() },
            { $set: { isRead: true } },
            { new: true },
        );
    });

    it('returns not found when a notification belongs to another user', async () => {
        vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(null);
        await expect(markNotificationRead(userId.toString(), notificationId.toString()))
            .rejects.toMatchObject<Partial<ApiError>>({ statusCode: 404, code: 'NOT_FOUND' });
    });

    it('marks unread notifications for only the current user', async () => {
        const update = vi.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 4 } as never);

        await expect(markAllNotificationsRead(userId.toString())).resolves.toEqual({ updatedCount: 4 });
        expect(update).toHaveBeenCalledWith(
            { userId: userId.toString(), isRead: false },
            { $set: { isRead: true } },
        );
    });
});
