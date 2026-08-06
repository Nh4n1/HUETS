import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Location from '../models/location.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { approveLocation, rejectLocation } from './location.service.ts';

const adminId = new mongoose.Types.ObjectId();
const locationId = new mongoose.Types.ObjectId();
const expectedUpdatedAt = new Date('2026-08-06T02:00:00.000Z');

const mockActiveAdmin = () => {
    vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: adminId, role: 'admin', status: 'active' }),
    } as never);
};

describe('location moderation', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('approves a pending location using status and updatedAt as atomic preconditions', async () => {
        mockActiveAdmin();
        const updatedLocation = {
            _id: locationId,
            status: 'approved',
            moderation: { reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: null },
            updatedAt: new Date(),
        };
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updatedLocation as never);

        const result = await approveLocation(
            locationId.toString(),
            { expectedStatus: 'pending', expectedUpdatedAt: expectedUpdatedAt.toISOString() },
            { id: adminId.toString(), role: 'admin' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            { _id: locationId.toString(), status: 'pending', updatedAt: expectedUpdatedAt },
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: 'approved',
                    'moderation.reviewedBy': adminId,
                    'moderation.rejectionReason': null,
                }),
            }),
            { new: true, runValidators: true },
        );
        expect(result.status).toBe('approved');
    });

    it('requires and stores a trimmed rejection reason', async () => {
        mockActiveAdmin();
        const updatedLocation = {
            _id: locationId,
            status: 'rejected',
            moderation: { reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: 'Sai vị trí' },
            updatedAt: new Date(),
        };
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updatedLocation as never);

        const result = await rejectLocation(
            locationId.toString(),
            {
                expectedStatus: 'pending',
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                reason: '  Sai vị trí  ',
            },
            { id: adminId.toString(), role: 'admin' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: 'rejected',
                    'moderation.rejectionReason': 'Sai vị trí',
                }),
            }),
            expect.any(Object),
        );
        expect(result.moderation.rejectionReason).toBe('Sai vị trí');
    });

    it('returns STALE_RESOURCE when the location no longer matches the preconditions', async () => {
        mockActiveAdmin();
        vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(null);
        vi.spyOn(Location, 'findById').mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue({ status: 'approved', updatedAt: new Date() }),
            }),
        } as never);

        await expect(approveLocation(
            locationId.toString(),
            { expectedStatus: 'pending', expectedUpdatedAt: expectedUpdatedAt.toISOString() },
            { id: adminId.toString(), role: 'admin' },
        )).rejects.toMatchObject<ApiError>({ statusCode: 409, code: 'STALE_RESOURCE' });
    });

    it('rejects moderation by a non-admin account even if the token role is stale', async () => {
        vi.spyOn(User, 'findById').mockReturnValue({
            select: vi.fn().mockResolvedValue({ _id: adminId, role: 'user', status: 'active' }),
        } as never);

        await expect(approveLocation(
            locationId.toString(),
            { expectedStatus: 'pending', expectedUpdatedAt: expectedUpdatedAt.toISOString() },
            { id: adminId.toString(), role: 'admin' },
        )).rejects.toMatchObject<ApiError>({ statusCode: 403, code: 'FORBIDDEN' });
    });
});
