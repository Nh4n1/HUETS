import { describe, expect, it } from 'vitest';
import LocationOwnership, { ownershipActiveKey } from '../models/locationOwnership.model.ts';
import { isLocationPublicValid } from './locationOwnership.service.ts';

describe('location ownership invariants', () => {
    it('uses the shared public-valid predicate', () => {
        expect(isLocationPublicValid({ status: 'approved', isDeleted: false })).toBe(true);
        expect(isLocationPublicValid({ status: 'approved' })).toBe(true);
        expect(isLocationPublicValid({ status: 'hidden', isDeleted: false })).toBe(false);
        expect(isLocationPublicValid({ status: 'approved', isDeleted: true })).toBe(false);
    });

    it('builds an unambiguous active key per User and Location', () => {
        expect(ownershipActiveKey('user-a', 'location-b')).toBe('user-a:location-b');
    });

    it('declares final uniqueness protection for active pair and verified Location', () => {
        const indexes = LocationOwnership.schema.indexes();
        expect(indexes).toEqual(expect.arrayContaining([
            [{ activeKey: 1 }, expect.objectContaining({ unique: true, sparse: true })],
            [{ locationId: 1 }, expect.objectContaining({
                unique: true,
                partialFilterExpression: { status: 'verified' },
            })],
        ]));
    });
});
