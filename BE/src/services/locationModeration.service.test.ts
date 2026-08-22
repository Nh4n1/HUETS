import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Location from '../models/location.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { approveLocation, hideLocation, rejectLocation, restoreLocation } from './location.service.ts';

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
            { _id: locationId.toString(), isDeleted: { $ne: true }, status: 'pending', updatedAt: expectedUpdatedAt },
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
        vi.spyOn(Location, 'findOne').mockReturnValue({
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

    it('hides an approved location and records the moderator and reason', async () => {
        mockActiveAdmin();
        const updatedLocation = {
            _id: locationId,
            status: 'hidden',
            moderation: {
                hiddenBy: adminId,
                hiddenAt: new Date(),
                hiddenReason: 'Cần xác minh thông tin',
                restoredBy: null,
                restoredAt: null,
            },
            updatedAt: new Date(),
        };
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updatedLocation as never);

        const result = await hideLocation(
            locationId.toString(),
            {
                expectedStatus: 'approved',
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                reason: '  Cần xác minh thông tin  ',
            },
            { id: adminId.toString(), role: 'admin' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            { _id: locationId.toString(), isDeleted: { $ne: true }, status: 'approved', updatedAt: expectedUpdatedAt },
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: 'hidden',
                    'moderation.hiddenBy': adminId,
                    'moderation.hiddenReason': 'Cần xác minh thông tin',
                    'moderation.restoredBy': null,
                }),
            }),
            { new: true, runValidators: true },
        );
        expect(result.status).toBe('hidden');
    });

    it('restores a hidden location and preserves the hiding audit fields', async () => {
        mockActiveAdmin();
        const hiddenAt = new Date('2026-08-05T01:00:00.000Z');
        const updatedLocation = {
            _id: locationId,
            status: 'approved',
            moderation: {
                hiddenBy: adminId,
                hiddenAt,
                hiddenReason: 'Cần xác minh thông tin',
                restoredBy: adminId,
                restoredAt: new Date(),
            },
            updatedAt: new Date(),
        };
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updatedLocation as never);

        const result = await restoreLocation(
            locationId.toString(),
            { expectedStatus: 'hidden', expectedUpdatedAt: expectedUpdatedAt.toISOString() },
            { id: adminId.toString(), role: 'admin' },
        );

        const update = updateSpy.mock.calls[0]?.[1] as { $set: Record<string, unknown> };
        expect(update.$set).toMatchObject({
            status: 'approved',
            'moderation.restoredBy': adminId,
        });
        expect(update.$set).not.toHaveProperty('moderation.hiddenReason');
        expect(result.moderation.hiddenReason).toBe('Cần xác minh thông tin');
    });

    it('rejects invalid visibility transitions', async () => {
        mockActiveAdmin();

        await expect(hideLocation(
            locationId.toString(),
            { expectedStatus: 'pending', expectedUpdatedAt: expectedUpdatedAt.toISOString(), reason: 'Lý do' },
            { id: adminId.toString(), role: 'admin' },
        )).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
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
