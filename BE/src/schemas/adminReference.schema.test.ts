import { describe, expect, it } from 'vitest';
import {
    createCategorySchema,
    createTagGroupSchema,
    taxonomyCodeSchema,
    updateCategorySchema,
    updateCategoryTagRulesSchema,
} from './adminReference.schema.ts';

describe('admin reference schemas', () => {
    it('normalizes a canonical taxonomy code', () => {
        expect(taxonomyCodeSchema.parse('  Wellness_Spa  ')).toBe('wellness_spa');
    });

    it('rejects codes outside the immutable identity format', () => {
        expect(() => taxonomyCodeSchema.parse('1 bad-code')).toThrow();
    });

    it('applies safe defaults when creating a category', () => {
        expect(createCategorySchema.parse({ code: 'spa', name: 'Spa' })).toMatchObject({
            sortOrder: 0,
            allowedTagCodes: [],
            recommendedTagCodes: [],
        });
    });

    it('does not accept code in a category update', () => {
        expect(() => updateCategorySchema.parse({ code: 'renamed' })).toThrow();
    });

    it('rejects duplicate tag codes in category rules', () => {
        expect(() => updateCategoryTagRulesSchema.parse({
            allowedTagCodes: ['quiet', 'quiet'],
            recommendedTagCodes: [],
        })).toThrow();
    });

    it('only accepts supported selection modes', () => {
        expect(() => createTagGroupSchema.parse({
            code: 'price',
            name: 'Giá',
            selectionMode: 'many',
        })).toThrow();
    });
});
