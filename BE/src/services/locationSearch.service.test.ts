import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Location from '../models/location.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import { getPublicLocations } from './location.service.ts';
import { clearLocationSearchCache, decideSearchPath, searchLocations } from './locationSearch.service.ts';
import { executeSearchPlan } from './locationSearchExecutor.service.ts';
import { getSearchCatalog } from './searchCatalog.service.ts';
import { validateSearchPlan } from './searchPlanValidator.service.ts';

vi.mock('./location.service.ts', () => ({
    getPublicLocations: vi.fn(),
}));

vi.mock('./searchCatalog.service.ts', () => ({
    getSearchCatalog: vi.fn().mockRejectedValue(new Error('catalog unavailable')),
}));

vi.mock('./searchPlanValidator.service.ts', () => ({ validateSearchPlan: vi.fn() }));
vi.mock('./locationSearchExecutor.service.ts', () => ({ executeSearchPlan: vi.fn() }));

const findOneQuery = (value: unknown) => ({
    select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(value),
    }),
});

const basicResult = {
    data: [{ id: 'location-1', name: 'Cà phê Muối' }],
    meta: { page: 1, pageSize: 8, total: 1, totalPages: 1 },
};

describe('location search service', () => {
    beforeEach(() => {
        vi.spyOn(TagGroup, 'find').mockReturnValue({
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([{
                tags: [
                    { code: 'quiet', name: 'Yên tĩnh', isActive: true },
                    { code: 'wifi', name: 'Wi-Fi', isActive: true },
                ],
            }]),
        } as never);
    });

    afterEach(() => {
        clearLocationSearchCache();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('selects Fast Path for an exact approved name', async () => {
        const findOne = vi.spyOn(Location, 'findOne')
            .mockReturnValueOnce(findOneQuery({ _id: 'location-1' }) as never);

        await expect(decideSearchPath('Cà phê Muối')).resolves.toEqual({
            path: 'fast',
            reason: 'exact_name',
        });

        expect(findOne).toHaveBeenCalledWith({
            status: 'approved',
            isDeleted: { $ne: true },
            normalizedName: 'ca phe muoi',
        });
        expect(findOne).toHaveBeenCalledTimes(1);
    });

    it('selects Fast Path for an exact approved alias', async () => {
        const findOne = vi.spyOn(Location, 'findOne')
            .mockReturnValueOnce(findOneQuery(null) as never)
            .mockReturnValueOnce(findOneQuery({ _id: 'location-1' }) as never);

        await expect(decideSearchPath('Tên gọi khác')).resolves.toEqual({
            path: 'fast',
            reason: 'exact_alias',
        });

        expect(findOne).toHaveBeenLastCalledWith({
            status: 'approved',
            isDeleted: { $ne: true },
            'aliases.normalizedValue': 'ten goi khac',
        });
    });

    it('returns successful basic results for a simple keyword', async () => {
        vi.spyOn(Location, 'findOne')
            .mockReturnValueOnce(findOneQuery(null) as never)
            .mockReturnValueOnce(findOneQuery(null) as never);
        vi.mocked(getPublicLocations).mockResolvedValue(basicResult as never);

        const result = await searchLocations({ query: 'cafe' });

        expect(getPublicLocations).toHaveBeenCalledWith({
            q: 'cafe',
            page: '1',
            pageSize: '8',
        });
        expect(result.data).toMatchObject({
            status: 'success',
            interpretation: null,
            locations: basicResult.data,
        });
    });

    it('returns no_exact_match when Fast Path has no results', async () => {
        vi.spyOn(Location, 'findOne')
            .mockReturnValueOnce(findOneQuery(null) as never)
            .mockReturnValueOnce(findOneQuery(null) as never);
        vi.mocked(getPublicLocations).mockResolvedValue({
            data: [],
            meta: { page: 1, pageSize: 8, total: 0, totalPages: 0 },
        } as never);

        const result = await searchLocations({ query: 'asdfghxyz' });

        expect(result.data).toMatchObject({
            status: 'no_exact_match',
            locations: [],
        });
    });

    it('rejects a query that has no letters or numbers after normalization', async () => {
        const findOne = vi.spyOn(Location, 'findOne');

        await expect(searchLocations({ query: '!!!' })).rejects.toMatchObject({
            statusCode: 400,
            code: 'INVALID_SEARCH_QUERY',
        });
        expect(findOne).not.toHaveBeenCalled();
        expect(getPublicLocations).not.toHaveBeenCalled();
    });

    it('returns AI unavailable with a basic fallback when semantic parsing cannot start', async () => {
        vi.spyOn(Location, 'findOne')
            .mockReturnValueOnce(findOneQuery(null) as never)
            .mockReturnValueOnce(findOneQuery(null) as never);
        vi.mocked(getPublicLocations).mockResolvedValue(basicResult as never);

        const result = await searchLocations({
            query: 'quán cafe yên tĩnh có Wi-Fi',
            page: 1,
            pageSize: 8,
        });

        expect(result.data).toMatchObject({
            status: 'ai_unavailable',
            interpretation: null,
            locations: basicResult.data,
        });
        expect(result.debug).toMatchObject({
            path: 'ai',
            reason: 'semantic_constraints',
        });
    });

    it('reuses a cached SearchPlan for the same normalized semantic query', async () => {
        vi.spyOn(Location, 'findOne').mockReturnValue(findOneQuery(null) as never);
        vi.mocked(getSearchCatalog).mockResolvedValue({
            categories: [{ code: 'cafe', name: 'Quán cà phê' }],
            tags: [{ code: 'quiet', name: 'Yên tĩnh', categoryCodes: ['cafe'] }],
            wards: [],
        });
        const criteria = {
            categoryCode: 'cafe', requiredTagCodes: [], preferredTagCodes: ['quiet'],
            keywords: [], wardCode: null, openCondition: null, sortBy: 'relevance' as const,
        };
        vi.mocked(validateSearchPlan).mockResolvedValue({
            criteria,
            interpretation: {
                category: { code: 'cafe', name: 'Quán cà phê' },
                requiredTags: [], preferredTags: [{ code: 'quiet', name: 'Yên tĩnh' }], ward: null,
            },
        });
        vi.mocked(executeSearchPlan).mockResolvedValue({ data: [], meta: { page: 1, pageSize: 8, total: 0, totalPages: 0 } });

        const first = await searchLocations({ query: 'Quán cafe yên tĩnh' });
        const second = await searchLocations({ query: '  quán   cafe YÊN TĨNH ' });

        expect(getSearchCatalog).toHaveBeenCalledTimes(1);
        expect(validateSearchPlan).toHaveBeenCalledTimes(1);
        expect(first.debug).toMatchObject({ cache: 'miss' });
        expect(second.debug).toMatchObject({ cache: 'hit' });
        expect(executeSearchPlan).toHaveBeenCalledTimes(2);
    });
});
