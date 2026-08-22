import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import {
    deleteMyLocationReview,
    getMyLocationReview,
    getMyLocationReviews,
    saveLocationReview,
    setLocationReviewVisibility,
} from './locationReview.service.ts';

const locationId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const reviewId = new mongoose.Types.ObjectId();

const approvedLocation = () => {
    vi.spyOn(Location, 'exists').mockResolvedValue({ _id: locationId } as never);
};

const mockSummary = (rows: Array<{ _id: number; count: number }>) => {
    vi.spyOn(LocationReview, 'aggregate').mockResolvedValue(rows);
    return vi.spyOn(Location, 'updateOne').mockResolvedValue({} as never);
};

describe('locationReview.service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the current non-deleted review with edit and visibility metadata', async () => {
        approvedLocation();
        const editedAt = new Date('2026-08-21T09:00:00.000Z');
        const lean = vi.fn().mockResolvedValue({
            _id: reviewId,
            locationId,
            userId,
            rating: 4,
            comment: 'Không gian đẹp.',
            status: 'hidden',
            editedAt,
            hiddenReason: 'Cần kiểm tra nội dung.',
            createdAt: new Date('2026-08-20T10:00:00.000Z'),
            updatedAt: new Date('2026-08-21T10:00:00.000Z'),
        });
        vi.spyOn(LocationReview, 'findOne').mockReturnValue({ lean } as never);

        const result = await getMyLocationReview(locationId.toString(), userId.toString());

        expect(LocationReview.findOne).toHaveBeenCalledWith({
            locationId: locationId.toString(),
            userId: userId.toString(),
            status: { $ne: 'deleted' },
        });
        expect(result).toMatchObject({
            id: reviewId.toString(),
            status: 'hidden',
            isEdited: true,
            editedAt,
            hiddenReason: 'Cần kiểm tra nội dung.',
        });
    });

    it('returns null when the current user has no visible own-review record', async () => {
        approvedLocation();
        vi.spyOn(LocationReview, 'findOne').mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);

        await expect(getMyLocationReview(locationId.toString(), userId.toString())).resolves.toBeNull();
    });

    it('returns the current user reviews with location snapshots and pagination', async () => {
        const updatedAt = new Date('2026-08-21T10:00:00.000Z');
        const reviews = [{
            _id: reviewId,
            locationId: {
                _id: locationId,
                name: 'Đại Nội Huế',
                status: 'approved',
                images: [
                    { url: 'second.jpg', position: 2 },
                    { url: 'cover.jpg', position: 0 },
                ],
            },
            userId,
            rating: 5,
            comment: 'Rất đẹp.',
            status: 'hidden',
            editedAt: updatedAt,
            hiddenReason: 'Đang kiểm tra.',
            createdAt: updatedAt,
            updatedAt,
        }];
        const query = {
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            populate: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(reviews),
        };
        vi.spyOn(LocationReview, 'find').mockReturnValue(query as never);
        vi.spyOn(LocationReview, 'countDocuments').mockResolvedValue(6);

        const result = await getMyLocationReviews(userId.toString(), { page: '2', pageSize: '5' });

        expect(LocationReview.find).toHaveBeenCalledWith({
            userId: userId.toString(),
            status: { $ne: 'deleted' },
        });
        expect(query.skip).toHaveBeenCalledWith(5);
        expect(query.limit).toHaveBeenCalledWith(5);
        expect(query.populate).toHaveBeenCalledWith('locationId', 'name images status');
        expect(result).toEqual({
            data: [expect.objectContaining({
                id: reviewId.toString(),
                location: {
                    id: locationId.toString(),
                    name: 'Đại Nội Huế',
                    coverImageUrl: 'cover.jpg',
                    status: 'approved',
                },
                rating: 5,
                status: 'hidden',
                isEdited: true,
                hiddenReason: 'Đang kiểm tra.',
            })],
            meta: { page: 2, pageSize: 5, total: 6, totalPages: 2 },
        });
    });

    it('creates a new active review without marking it as edited', async () => {
        approvedLocation();
        vi.spyOn(LocationReview, 'findOne').mockResolvedValue(null);
        const create = vi.spyOn(LocationReview, 'create').mockResolvedValue({
            _id: reviewId,
            rating: 5,
            comment: 'Rất đáng ghé thăm.',
            status: 'active',
            editedAt: null,
            updatedAt: new Date('2026-08-21T10:00:00.000Z'),
        } as never);
        const updateLocation = mockSummary([{ _id: 5, count: 3 }, { _id: 4, count: 1 }]);

        const result = await saveLocationReview(
            locationId.toString(),
            { rating: 5, comment: '  Rất đáng ghé thăm.  ' },
            userId.toString(),
        );

        expect(create).toHaveBeenCalledWith({
            locationId: locationId.toString(),
            userId: userId.toString(),
            rating: 5,
            comment: 'Rất đáng ghé thăm.',
            status: 'active',
        });
        const expectedSummary = {
            average: 4.8,
            count: 4,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 },
        };
        expect(updateLocation).toHaveBeenCalledWith(
            { _id: locationId.toString() },
            { $set: { ratingSummary: expectedSummary } },
        );
        expect(result).toMatchObject({ status: 'active', isEdited: false, ratingSummary: expectedSummary });
    });

    it('marks a changed active review as edited', async () => {
        approvedLocation();
        vi.spyOn(LocationReview, 'findOne').mockResolvedValue({
            _id: reviewId,
            rating: 3,
            comment: 'Nội dung cũ',
            status: 'active',
        } as never);
        const findByIdAndUpdate = vi.spyOn(LocationReview, 'findByIdAndUpdate').mockResolvedValue({
            _id: reviewId,
            rating: 4,
            comment: 'Nội dung mới',
            status: 'active',
            editedAt: new Date(),
            updatedAt: new Date(),
        } as never);
        mockSummary([{ _id: 4, count: 1 }]);

        const result = await saveLocationReview(
            locationId.toString(),
            { rating: 4, comment: 'Nội dung mới' },
            userId.toString(),
        );

        expect(findByIdAndUpdate).toHaveBeenCalledWith(
            reviewId,
            expect.objectContaining({
                $set: expect.objectContaining({ rating: 4, comment: 'Nội dung mới', status: 'active', editedAt: expect.any(Date) }),
                $inc: { editCount: 1 },
            }),
            { new: true, runValidators: true },
        );
        expect(result.isEdited).toBe(true);
    });

    it('soft-deletes idempotently and removes the review from the rating summary', async () => {
        approvedLocation();
        const updateReview = vi.spyOn(LocationReview, 'findOneAndUpdate').mockResolvedValue(null);
        const updateLocation = mockSummary([]);

        const result = await deleteMyLocationReview(locationId.toString(), userId.toString());

        expect(updateReview).toHaveBeenCalledWith(
            { locationId: locationId.toString(), userId: userId.toString(), status: { $ne: 'deleted' } },
            { $set: { status: 'deleted', deletedAt: expect.any(Date) } },
            { new: true },
        );
        expect(updateLocation).toHaveBeenCalledWith(
            { _id: locationId.toString() },
            { $set: { ratingSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } } },
        );
        expect(result).toEqual({
            deleted: false,
            ratingSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        });
    });

    it('lets an admin hide an active review and recalculates the location summary', async () => {
        vi.spyOn(LocationReview, 'findById').mockResolvedValue({
            _id: reviewId,
            locationId,
            status: 'active',
        } as never);
        const updateReview = vi.spyOn(LocationReview, 'findByIdAndUpdate').mockResolvedValue({
            _id: reviewId,
            status: 'hidden',
        } as never);
        mockSummary([{ _id: 4, count: 2 }]);

        const result = await setLocationReviewVisibility(
            reviewId.toString(),
            { status: 'hidden', reason: '  Nội dung vi phạm.  ' },
            adminId.toString(),
        );

        expect(updateReview).toHaveBeenCalledWith(
            reviewId.toString(),
            {
                $set: {
                    status: 'hidden',
                    hiddenAt: expect.any(Date),
                    hiddenBy: adminId.toString(),
                    hiddenReason: 'Nội dung vi phạm.',
                },
            },
            { new: true, runValidators: true },
        );
        expect(result.status).toBe('hidden');
        expect(result.ratingSummary.count).toBe(2);
    });
});
