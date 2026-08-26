import { afterEach, describe, expect, it, vi } from 'vitest';
import Category from '../models/category.model.ts';
import Location from '../models/location.model.ts';
import { getMyLocationById, getMyLocations } from './location.service.ts';

const actor = { id: 'user-id', role: 'user' } as const;

describe('owner location query', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('includes every non-deleted contribution owned by the current user', async () => {
        const findQuery = {
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([]),
        };
        const findSpy = vi.spyOn(Location, 'find').mockReturnValue(findQuery as never);
        const countSpy = vi.spyOn(Location, 'countDocuments').mockResolvedValue(0);
        vi.spyOn(Category, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        } as never);

        await getMyLocations(actor, {});

        const expectedFilter = {
            createdBy: actor.id,
            isDeleted: { $ne: true },
        };
        expect(findSpy).toHaveBeenCalledWith(expectedFilter);
        expect(countSpy).toHaveBeenCalledWith(expectedFilter);
    });

    it('allows filtering the owner list by hidden status', async () => {
        const findQuery = {
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([]),
        };
        const findSpy = vi.spyOn(Location, 'find').mockReturnValue(findQuery as never);
        vi.spyOn(Location, 'countDocuments').mockResolvedValue(0);
        vi.spyOn(Category, 'find').mockReturnValue({
            select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        } as never);

        await getMyLocations(actor, { status: 'hidden' });
        expect(findSpy).toHaveBeenCalledWith({
            createdBy: actor.id,
            isDeleted: { $ne: true },
            status: 'hidden',
        });
    });

    it('scopes owner detail lookup to the current user', async () => {
        const locationId = '66c4f9ad15e7f9a2c5e14d01';
        const findSpy = vi.spyOn(Location, 'findOne').mockResolvedValue(null);

        await expect(getMyLocationById(locationId, actor)).rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_FOUND',
        });
        expect(findSpy).toHaveBeenCalledWith({
            _id: locationId,
            createdBy: actor.id,
            isDeleted: { $ne: true },
        });
    });
});
