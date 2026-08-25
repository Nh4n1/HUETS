import { describe, expect, it } from 'vitest';
import Notification from './notification.model.ts';

describe('Notification model', () => {
    it('defines list, unread, and 90-day TTL support indexes', () => {
        expect(Notification.schema.indexes()).toEqual(expect.arrayContaining([
            [{ userId: 1, createdAt: -1 }, expect.any(Object)],
            [{ userId: 1, isRead: 1 }, expect.any(Object)],
            [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
        ]));
    });
});
