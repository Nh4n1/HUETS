import { describe, expect, it } from 'vitest';
import {
    executeLocationSearchRequestSchema,
    initialLocationSearchRequestSchema,
    searchPlanSchema,
} from './locationSearch.schema.ts';

const validPlan = {
    categoryCode: 'cafe',
    requiredTagCodes: ['wifi'],
    preferredTagCodes: ['quiet'],
    keywords: [],
    wardCode: null,
    sortBy: 'relevance' as const,
};

describe('location search schemas', () => {
    it('accepts a valid SearchPlan', () => {
        expect(searchPlanSchema.safeParse(validPlan).success).toBe(true);
    });

    it('rejects a tag that is both required and preferred', () => {
        const result = searchPlanSchema.safeParse({
            ...validPlan,
            preferredTagCodes: ['wifi'],
        });

        expect(result.success).toBe(false);
    });

    it('rejects duplicate tags and unsupported sort values', () => {
        expect(searchPlanSchema.safeParse({
            ...validPlan,
            requiredTagCodes: ['wifi', 'wifi'],
        }).success).toBe(false);

        expect(searchPlanSchema.safeParse({
            ...validPlan,
            sortBy: 'distance_asc',
        }).success).toBe(false);
    });

    it('trims the query and applies pagination defaults', () => {
        expect(initialLocationSearchRequestSchema.parse({ query: '  cafe  ' })).toEqual({
            query: 'cafe',
            page: 1,
            pageSize: 8,
        });
    });

    it('rejects empty queries and invalid pagination', () => {
        expect(initialLocationSearchRequestSchema.safeParse({ query: '   ' }).success).toBe(false);
        expect(initialLocationSearchRequestSchema.safeParse({ query: 'cafe', page: 0 }).success).toBe(false);
    });

    it('validates execute requests with the same SearchPlan contract', () => {
        expect(executeLocationSearchRequestSchema.safeParse({
            criteria: validPlan,
            page: 2,
            pageSize: 8,
        }).success).toBe(true);
    });
});
