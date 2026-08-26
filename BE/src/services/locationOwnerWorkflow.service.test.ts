import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Category from '../models/category.model.ts';
import Location from '../models/location.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import { resubmitMyLocation, updateMyLocation, withdrawMyLocation } from './location.service.ts';

const ownerId = new mongoose.Types.ObjectId();
const locationId = new mongoose.Types.ObjectId();
const imageId = new mongoose.Types.ObjectId();
const expectedUpdatedAt = new Date('2026-08-25T03:00:00.000Z');
const actor = { id: ownerId.toString(), role: 'user' } as const;

const locationDocument = (overrides: Record<string, unknown> = {}) => ({
    _id: locationId,
    createdBy: ownerId,
    name: 'Quán cà phê cũ',
    normalizedName: 'quan ca phe cu',
    description: 'Mô tả cũ',
    categoryCode: 'cafe',
    tagCodes: [],
    aliases: [],
    address: {
        wardCode: '19753',
        wardNameSnapshot: 'Phường Phú Xuân',
        addressLine: '1 Đường Cũ',
        locationNote: null,
    },
    geo: { type: 'Point', coordinates: [107.58, 16.47] },
    images: [{ _id: imageId, url: 'https://example.com/image.jpg', publicId: null, position: 0 }],
    openingHours: { status: 'unknown', periods: [] },
    ratingSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    status: 'rejected',
    moderation: {
        reviewedBy: new mongoose.Types.ObjectId(),
        reviewedAt: new Date(),
        rejectionReason: 'Thiếu mô tả',
        submittedAt: new Date(),
        withdrawnAt: null,
        hiddenBy: null,
        hiddenAt: null,
        hiddenReason: null,
        restoredBy: null,
        restoredAt: null,
    },
    editHistory: [],
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: expectedUpdatedAt,
    ...overrides,
});

const mockDetailCategory = () => {
    vi.spyOn(Category, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ code: 'cafe', name: 'Quán cà phê' }]),
        }),
    } as never);
};

describe('owner location workflow', () => {
    afterEach(() => vi.restoreAllMocks());

    it('updates an owned rejected contribution without changing its status', async () => {
        const current = locationDocument();
        const updated = locationDocument({ name: 'Quán cà phê mới', normalizedName: 'quan ca phe moi' });
        vi.spyOn(Location, 'findOne').mockResolvedValue(current as never);
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updated as never);
        vi.spyOn(Category, 'findOne').mockReturnValue({
            select: vi.fn().mockResolvedValue({ code: 'cafe', name: 'Quán cà phê', allowedTagCodes: [] }),
        } as never);
        vi.spyOn(TagGroup, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        } as never);
        mockDetailCategory();

        await updateMyLocation(locationId.toString(), {
            expectedStatus: 'rejected',
            expectedUpdatedAt: expectedUpdatedAt.toISOString(),
            name: 'Quán cà phê mới',
            description: 'Mô tả cũ',
            categoryCode: 'cafe',
            tagCodes: [],
            aliases: [],
            wardCode: '19753',
            addressLine: '1 Đường Cũ',
            latitude: 16.47,
            longitude: 107.58,
            openingHours: { status: 'unknown', periods: [] },
        }, actor);

        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: locationId.toString(),
                createdBy: actor.id,
                status: 'rejected',
                updatedAt: expectedUpdatedAt,
            }),
            expect.objectContaining({
                $push: { editHistory: expect.objectContaining({ editedBy: ownerId, changedFields: ['name'] }) },
            }),
            { new: true, runValidators: true },
        );
        const update = updateSpy.mock.calls[0]?.[1] as { $set: Record<string, unknown> };
        expect(update.$set).not.toHaveProperty('status');
    });

    it('resubmits only the owner rejected contribution with atomic preconditions', async () => {
        const updated = locationDocument({ status: 'pending', moderation: { ...locationDocument().moderation, rejectionReason: null } });
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updated as never);
        mockDetailCategory();

        const result = await resubmitMyLocation(locationId.toString(), {
            expectedStatus: 'rejected',
            expectedUpdatedAt: expectedUpdatedAt.toISOString(),
        }, actor);

        expect(updateSpy).toHaveBeenCalledWith(
            {
                _id: locationId.toString(),
                createdBy: actor.id,
                isDeleted: { $ne: true },
                status: 'rejected',
                updatedAt: expectedUpdatedAt,
            },
            expect.objectContaining({ $set: expect.objectContaining({ status: 'pending', 'moderation.rejectionReason': null }) }),
            { new: true, runValidators: true },
        );
        expect(result.status).toBe('pending');
    });

    it('withdraws an owned pending contribution', async () => {
        const updated = locationDocument({ status: 'withdrawn' });
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updated as never);
        mockDetailCategory();

        const result = await withdrawMyLocation(locationId.toString(), {
            expectedStatus: 'pending',
            expectedUpdatedAt: expectedUpdatedAt.toISOString(),
        }, actor);

        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({ createdBy: actor.id, status: 'pending', updatedAt: expectedUpdatedAt }),
            expect.objectContaining({ $set: expect.objectContaining({ status: 'withdrawn', 'moderation.withdrawnAt': expect.any(Date) }) }),
            { new: true, runValidators: true },
        );
        expect(result.status).toBe('withdrawn');
    });

    it('returns not found rather than exposing another user contribution', async () => {
        vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(null);
        vi.spyOn(Location, 'findOne').mockReturnValue({
            select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
        } as never);

        await expect(resubmitMyLocation(locationId.toString(), {
            expectedStatus: 'rejected',
            expectedUpdatedAt: expectedUpdatedAt.toISOString(),
        }, actor)).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    });
});
