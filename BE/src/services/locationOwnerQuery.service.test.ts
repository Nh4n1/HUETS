import { afterEach, describe, expect, it, vi } from 'vitest';
import Category from '../models/category.model.ts';
import Location from '../models/location.model.ts';
import { getMyLocations } from './location.service.ts';

const actor = { id: 'user-id', role: 'user' } as const;

describe('owner location query', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('excludes hidden locations from both the contribution list and total', async () => {
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
            status: { $ne: 'hidden' },
        };
        expect(findSpy).toHaveBeenCalledWith(expectedFilter);
        expect(countSpy).toHaveBeenCalledWith(expectedFilter);
    });

    it('does not allow requesting hidden contributions explicitly', async () => {
        await expect(getMyLocations(actor, { status: 'hidden' })).rejects.toMatchObject({
            statusCode: 400,
            code: 'VALIDATION_ERROR',
        });
    });
});
