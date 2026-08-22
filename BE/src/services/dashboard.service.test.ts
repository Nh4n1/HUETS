import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import * as userService from './user.service.ts';
import { getDashboard } from './dashboard.service.ts';

const pendingId = new mongoose.Types.ObjectId();
const submittedAt = new Date('2026-08-20T02:00:00.000Z');

const mockOldestPending = () => {
    vi.spyOn(Location, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{
            _id: pendingId,
            name: 'Đại Nội Huế',
            categoryCode: 'heritage',
            address: { wardNameSnapshot: 'Phú Xuân' },
            moderation: { submittedAt },
            createdAt: submittedAt,
        }]),
    } as never);
};

describe('dashboard.service', () => {
    afterEach(() => vi.restoreAllMocks());

    it('returns moderation data without user statistics for a moderator', async () => {
        vi.spyOn(Location, 'aggregate').mockResolvedValue([
            { _id: 'pending', count: 3 },
            { _id: 'approved', count: 10 },
        ] as never);
        vi.spyOn(LocationReview, 'aggregate').mockResolvedValue([{ _id: 'active', count: 8 }] as never);
        vi.spyOn(Itinerary, 'aggregate').mockResolvedValue([{ _id: 'active', count: 4 }] as never);
        vi.spyOn(Location, 'countDocuments').mockResolvedValue(1 as never);
        const userStatsSpy = vi.spyOn(userService, 'getAdminUserStats');
        mockOldestPending();

        const result = await getDashboard('mod');

        expect(result.locations).toMatchObject({ pending: 3, approved: 10, overduePending: 1 });
        expect(result.locations.oldestPending[0]).toMatchObject({
            id: pendingId.toString(),
            name: 'Đại Nội Huế',
            submittedAt,
        });
        expect(result.users).toBeNull();
        expect(userStatsSpy).not.toHaveBeenCalled();
    });

    it('includes account statistics for an administrator', async () => {
        vi.spyOn(Location, 'aggregate').mockResolvedValue([] as never);
        vi.spyOn(LocationReview, 'aggregate').mockResolvedValue([] as never);
        vi.spyOn(Itinerary, 'aggregate').mockResolvedValue([] as never);
        vi.spyOn(Location, 'countDocuments').mockResolvedValue(0 as never);
        vi.spyOn(userService, 'getAdminUserStats').mockResolvedValue({
            total: 20,
            active: 18,
            locked: 2,
            moderators: 3,
        });
        mockOldestPending();

        const result = await getDashboard('admin');

        expect(result.users).toEqual({ total: 20, active: 18, locked: 2, moderators: 3 });
    });
});
