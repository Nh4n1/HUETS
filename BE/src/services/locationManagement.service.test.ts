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
        restoredBy: null,
        restoredAt: null,
    },
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    deletedFromStatus: null,
    createdAt: new Date(),
    updatedAt: expectedUpdatedAt,
    ...overrides,
});

const mockActiveManager = (role: 'mod' | 'admin' = 'admin') => {
    vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: adminId, role, status: 'active' }),
    } as never);
};

const mockAdminLocationDetailDependencies = () => {
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
};

describe('admin location management', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('updates editable data without changing status, contributor or rating', async () => {
        mockActiveManager();
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
        mockAdminLocationDetailDependencies();

        const result = await updateAdminLocation(
            locationId.toString(),
            {
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                reason: '  Chuẩn hóa thông tin địa điểm  ',
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
        const audit = (updateSpy.mock.calls[0]?.[1] as {
            $push: { editHistory: Record<string, unknown> };
        }).$push.editHistory;
        expect(audit).toMatchObject({
            editedBy: adminId,
            reason: 'Chuẩn hóa thông tin địa điểm',
            changedFields: expect.arrayContaining(['name', 'description', 'address']),
            before: expect.objectContaining({ name: 'Địa điểm cũ' }),
            after: expect.objectContaining({ name: 'Địa điểm mới' }),
        });
        expect(result.location.name).toBe('Địa điểm mới');
    });

    it('allows a moderator to edit a pending location and applies an atomic status precondition', async () => {
        mockActiveManager('mod');
        const current = locationDocument({ status: 'pending' });
        const updated = locationDocument({ status: 'pending', description: 'Mô tả đã xác minh' });
        vi.spyOn(Location, 'findOne').mockResolvedValue(current as never);
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(updated as never);
        mockAdminLocationDetailDependencies();

        await updateAdminLocation(
            locationId.toString(),
            {
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                reason: 'Xác minh lại nội dung',
                name: 'Địa điểm cũ',
                description: 'Mô tả đã xác minh',
                categoryCode: 'cafe',
                tagCodes: [],
                aliases: [],
                wardCode: '19753',
                addressLine: '1 Đường Cũ',
                latitude: 16.47,
                longitude: 107.58,
                openingHours: { status: 'unknown', periods: [] },
            },
            { id: adminId.toString(), role: 'mod' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: locationId.toString(),
                status: 'pending',
                updatedAt: expectedUpdatedAt,
            }),
            expect.objectContaining({
                $push: {
                    editHistory: expect.objectContaining({
                        editedBy: adminId,
                        reason: 'Xác minh lại nội dung',
                        changedFields: ['description'],
                    }),
                },
            }),
            { new: true, runValidators: true },
        );
    });

    it('does not allow a moderator to edit a location that is no longer pending', async () => {
        mockActiveManager('mod');
        vi.spyOn(Location, 'findOne').mockResolvedValue(locationDocument({ status: 'approved' }) as never);
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate');

        await expect(updateAdminLocation(
            locationId.toString(),
            { expectedUpdatedAt: expectedUpdatedAt.toISOString(), reason: 'Sửa nội dung' },
            { id: adminId.toString(), role: 'mod' },
        )).rejects.toMatchObject({ code: 'MODERATOR_CAN_ONLY_EDIT_PENDING', statusCode: 403 });
        expect(updateSpy).not.toHaveBeenCalled();
    });

    it('soft deletes a location without deleting its bookmarks', async () => {
        mockActiveManager();
        const deleteBookmarks = vi.spyOn(Bookmark, 'deleteMany');
        const updateSpy = vi.spyOn(Location, 'findOneAndUpdate').mockResolvedValue(
            locationDocument({ status: 'hidden', isDeleted: true, deletedBy: adminId }) as never,
        );

        const result = await deleteAdminLocation(
            locationId.toString(),
            {
                expectedStatus: 'hidden',
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                reason: '  Dữ liệu thử nghiệm  ',
            },
            { id: adminId.toString(), role: 'admin' },
        );

        expect(updateSpy).toHaveBeenCalledWith(
            {
                _id: locationId.toString(),
                isDeleted: { $ne: true },
                status: 'hidden',
                updatedAt: expectedUpdatedAt,
            },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: expect.any(Date),
                    deletedBy: adminId,
                    deletionReason: 'Dữ liệu thử nghiệm',
                    deletedFromStatus: 'hidden',
                    updatedAt: expect.any(Date),
                },
            },
            { new: true, runValidators: true },
        );
        expect(result).toEqual({ deleted: true });
        expect(deleteBookmarks).not.toHaveBeenCalled();
    });

    it('does not soft delete a pending or approved location', async () => {
        mockActiveManager();

        await expect(deleteAdminLocation(
            locationId.toString(),
            {
                expectedStatus: 'approved',
                expectedUpdatedAt: expectedUpdatedAt.toISOString(),
                reason: 'Không còn sử dụng',
            },
            { id: adminId.toString(), role: 'admin' },
        )).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
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
