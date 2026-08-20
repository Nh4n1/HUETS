import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Category from '../models/category.model.ts';
import Bookmark from '../models/bookmark.model.ts';
import Location from '../models/location.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import User from '../models/user.model.ts';
import { signLocationImageAssetToken } from '../helpers/locationAssetToken.helper.ts';
import {
    deleteAdminLocation,
    parseLocationImages,
    updateAdminLocation,
} from './location.service.ts';

const adminId = new mongoose.Types.ObjectId();
const contributorId = new mongoose.Types.ObjectId();
const locationId = new mongoose.Types.ObjectId();
const imageId = new mongoose.Types.ObjectId();
const expectedUpdatedAt = new Date('2026-08-20T03:00:00.000Z');

const locationDocument = (overrides: Record<string, unknown> = {}) => ({
    _id: locationId,
    createdBy: contributorId,
    name: 'Địa điểm cũ',
    normalizedName: 'dia diem cu',
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
    ratingSummary: { average: 0, count: 0 },
    status: 'approved',
    moderation: {
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
        submittedAt: new Date(),
        withdrawnAt: null,
        hiddenBy: null,
        hiddenAt: null,
        hiddenReason: null,
    },
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: expectedUpdatedAt,
    ...overrides,
});

const mockActiveAdmin = () => {
    vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: adminId, role: 'admin', status: 'active' }),
    } as never);
};

describe('admin location management', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('updates editable data without changing status, contributor or rating', async () => {
        mockActiveAdmin();
        const current = locationDocument();
        const updated = locationDocument({
            name: 'Địa điểm mới',
            normalizedName: 'dia diem moi',
            description: 'Mô tả mới',
            address: {
                wardCode: '19753',
                wardNameSnapshot: 'Phường Phú Xuân',
                addressLine: '2 Đường Mới',
                locationNote: null,
            },
        });
        vi.spyOn(Location, 'findOne').mockResolvedValue(current as never);
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updated as never);
        vi.spyOn(Category, 'findOne').mockReturnValue({
            select: vi.fn().mockResolvedValue({ code: 'cafe', name: 'Quán cà phê' }),
        } as never);
        vi.spyOn(TagGroup, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        } as never);
        vi.spyOn(Category, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([{ code: 'cafe', name: 'Quán cà phê' }]),
            }),
        } as never);
        vi.spyOn(User, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([{
                    _id: contributorId,
                    email: 'contributor@example.com',
                    displayName: 'Người đóng góp',
                }]),
            }),
        } as never);
        vi.spyOn(Location, 'init').mockResolvedValue(Location as never);
        vi.spyOn(Location, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
            }),
        } as never);
        vi.spyOn(Location, 'aggregate').mockResolvedValue([]);

        const result = await updateAdminLocation(
            locationId.toString(),
            {
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                name: '  Địa điểm mới  ',
                description: 'Mô tả mới',
                categoryCode: 'cafe',
                tagCodes: [],
                aliases: [],
                wardCode: '19753',
                addressLine: '2 Đường Mới',
                latitude: 16.47,
                longitude: 107.58,
                openingHours: { status: 'unknown', periods: [] },
            },
            { id: adminId.toString(), role: 'admin' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            { _id: locationId.toString(), isDeleted: { $ne: true }, updatedAt: expectedUpdatedAt },
            expect.objectContaining({
                $set: expect.objectContaining({
                    name: 'Địa điểm mới',
                    description: 'Mô tả mới',
                }),
            }),
            { new: true, runValidators: true },
        );
        const update = updateSpy.mock.calls[0]?.[1] as { $set: Record<string, unknown> };
        expect(update.$set).not.toHaveProperty('status');
        expect(update.$set).not.toHaveProperty('createdBy');
        expect(update.$set).not.toHaveProperty('ratingSummary');
        expect(result.location.name).toBe('Địa điểm mới');
    });

    it('soft deletes a location with an atomic updatedAt precondition', async () => {
        mockActiveAdmin();
        const deleteBookmarks = vi.spyOn(Bookmark, 'deleteMany').mockResolvedValue({ deletedCount: 2 } as never);
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(
            locationDocument({ isDeleted: true, deletedBy: adminId }) as never,
        );

        const result = await deleteAdminLocation(
            locationId.toString(),
            { expectedUpdatedAt: expectedUpdatedAt.toISOString() },
            { id: adminId.toString(), role: 'admin' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            { _id: locationId.toString(), isDeleted: { $ne: true }, updatedAt: expectedUpdatedAt },
            { $set: { isDeleted: true, deletedAt: expect.any(Date), deletedBy: adminId } },
            { new: true, runValidators: true },
        );
        expect(result).toEqual({ deleted: true });
        expect(deleteBookmarks).toHaveBeenCalledWith({ targetType: 'location', targetId: locationId });
    });

    it('combines existing images with newly uploaded assets and preserves their order', () => {
        const token = signLocationImageAssetToken({
            sub: adminId.toString(),
            url: 'https://res.cloudinary.com/demo/image/upload/new-image.jpg',
            publicId: 'huetrip/new-image',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
        });
        const existingImages = locationDocument().images as never;

        const images = parseLocationImages(
            [
                { assetToken: token, position: 0 },
                { existingImageId: imageId.toString(), position: 1 },
            ],
            adminId.toString(),
            existingImages,
        );

        expect(images).toEqual([
            expect.objectContaining({ publicId: 'huetrip/new-image', position: 0 }),
            expect.objectContaining({ _id: imageId, position: 1 }),
        ]);
    });
});
