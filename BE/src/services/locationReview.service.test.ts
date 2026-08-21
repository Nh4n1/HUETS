import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import {
    deleteMyLocationReview,
    getMyLocationReview,
    saveLocationReview,
} from './locationReview.service.ts';

const locationId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const reviewId = new mongoose.Types.ObjectId();

const approvedLocation = () => {
    vi.spyOn(Location, 'exists').mockResolvedValue({ _id: locationId } as never);
};

describe('locationReview.service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the current user review independently from the public review page', async () => {
        approvedLocation();
        const review = {
            _id: reviewId,
            locationId,
            userId,
            rating: 4,
            comment: 'Không gian đẹp.',
            createdAt: new Date('2026-08-20T10:00:00.000Z'),
            updatedAt: new Date('2026-08-21T10:00:00.000Z'),
        };
        const lean = vi.fn().mockResolvedValue(review);
        vi.spyOn(LocationReview, 'findOne').mockReturnValue({ lean } as never);

        const result = await getMyLocationReview(locationId.toString(), userId.toString());

        expect(LocationReview.findOne).toHaveBeenCalledWith({
            locationId: locationId.toString(),
            userId: userId.toString(),
        });
        expect(result).toMatchObject({
            id: reviewId.toString(),
            userId: userId.toString(),
            rating: 4,
            comment: 'Không gian đẹp.',
        });
    });

    it('returns null when the current user has not reviewed the location', async () => {
        approvedLocation();
        const lean = vi.fn().mockResolvedValue(null);
        vi.spyOn(LocationReview, 'findOne').mockReturnValue({ lean } as never);

        await expect(getMyLocationReview(locationId.toString(), userId.toString())).resolves.toBeNull();
    });

    it('upserts one review and stores the recalculated rating summary', async () => {
        approvedLocation();
        vi.spyOn(LocationReview, 'findOneAndUpdate').mockResolvedValue({
            _id: reviewId,
            rating: 5,
            comment: 'Rất đáng ghé thăm.',
            updatedAt: new Date('2026-08-21T10:00:00.000Z'),
        } as never);
        vi.spyOn(LocationReview, 'aggregate').mockResolvedValue([{ average: 4.56, count: 10 }]);
        const updateLocation = vi.spyOn(Location, 'updateOne').mockResolvedValue({} as never);

        const result = await saveLocationReview(
            locationId.toString(),
            { rating: 5, comment: '  Rất đáng ghé thăm.  ' },
            userId.toString(),
        );

        expect(LocationReview.findOneAndUpdate).toHaveBeenCalledWith(
            { locationId: locationId.toString(), userId: userId.toString() },
            { $set: { rating: 5, comment: 'Rất đáng ghé thăm.' } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        expect(updateLocation).toHaveBeenCalledWith(
            { _id: locationId.toString() },
            { $set: { ratingSummary: { average: 4.6, count: 10 } } },
        );
        expect(result.ratingSummary).toEqual({ average: 4.6, count: 10 });
    });

    it('deletes idempotently and resets the summary when no reviews remain', async () => {
        approvedLocation();
        vi.spyOn(LocationReview, 'deleteOne').mockResolvedValue({ deletedCount: 0 } as never);
        vi.spyOn(LocationReview, 'aggregate').mockResolvedValue([]);
        const updateLocation = vi.spyOn(Location, 'updateOne').mockResolvedValue({} as never);

        const result = await deleteMyLocationReview(locationId.toString(), userId.toString());

        expect(LocationReview.deleteOne).toHaveBeenCalledWith({
            locationId: locationId.toString(),
            userId: userId.toString(),
        });
        expect(updateLocation).toHaveBeenCalledWith(
            { _id: locationId.toString() },
            { $set: { ratingSummary: { average: 0, count: 0 } } },
        );
        expect(result).toEqual({ deleted: false, ratingSummary: { average: 0, count: 0 } });
    });
});
