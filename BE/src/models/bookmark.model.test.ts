import { describe, expect, it } from 'vitest';
import Bookmark from './bookmark.model.ts';

describe('Bookmark model', () => {
    it('has a unique user-target compound index', () => {
        const index = Bookmark.schema.indexes().find(([fields]) =>
            fields.userId === 1 && fields.targetType === 1 && fields.targetId === 1);

        expect(index).toBeDefined();
        expect(index?.[1]).toMatchObject({ unique: true });
    });
});
