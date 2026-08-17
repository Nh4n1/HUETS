import { afterEach, describe, expect, it, vi } from 'vitest';
import TagGroup from '../models/tagGroup.model.ts';
import { validateSearchPlan } from './searchPlanValidator.service.ts';

const tagGroupQuery = (value: unknown) => ({
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(value) }),
});

describe('validateSearchPlan', () => {
    afterEach(() => vi.restoreAllMocks());

    it('allows an active cross-category tag when no category is specified', async () => {
        vi.spyOn(TagGroup, 'find').mockReturnValue(tagGroupQuery([{
            code: 'suitable_for',
            selectionMode: 'multiple',
            tags: [{ code: 'family', name: 'Gia đình', isActive: true }],
        }]) as never);

        const result = await validateSearchPlan({
            categoryCode: null,
            requiredTagCodes: [],
            preferredTagCodes: ['family'],
            keywords: [],
            wardCode: null,
            openCondition: null,
            sortBy: 'relevance',
        });

        expect(result.criteria.preferredTagCodes).toEqual(['family']);
        expect(result.interpretation).toMatchObject({
            category: null,
            preferredTags: [{ code: 'family', name: 'Gia đình' }],
        });
    });
});
