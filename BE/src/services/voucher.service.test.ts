import { describe, expect, it } from 'vitest';
import VoucherClaim from '../models/voucherClaim.model.ts';
import { diversifyVouchersByLocation, getPublicVoucherSort, isVoucherClaimable } from './voucher.service.ts';

const now = new Date('2026-09-05T00:00:00.000Z');
const voucher = {
    status: 'active' as const,
    claimStartAt: new Date('2026-09-01T00:00:00.000Z'),
    claimEndAt: new Date('2026-09-10T00:00:00.000Z'),
    claimedCount: 4,
    totalQuantity: 5,
};

describe('voucher invariants', () => {
    it('derives claimable from Voucher, Location and issuing ownership', () => {
        expect(isVoucherClaimable(voucher, { status: 'approved', isDeleted: false }, { status: 'verified' }, now)).toBe(true);
        expect(isVoucherClaimable({ ...voucher, status: 'paused' }, { status: 'approved' }, { status: 'verified' }, now)).toBe(false);
        expect(isVoucherClaimable({ ...voucher, claimedCount: 5 }, { status: 'approved' }, { status: 'verified' }, now)).toBe(false);
        expect(isVoucherClaimable(voucher, { status: 'hidden' }, { status: 'verified' }, now)).toBe(false);
        expect(isVoucherClaimable(voucher, { status: 'approved' }, { status: 'revoked' }, now)).toBe(false);
    });

    it('protects one claim per User and Voucher with a unique index', () => {
        expect(VoucherClaim.schema.indexes()).toEqual(expect.arrayContaining([
            [{ voucherId: 1, userId: 1 }, expect.objectContaining({ unique: true })],
        ]));
    });

    it('diversifies an Explore preview before filling repeated Locations', () => {
        const candidates = [
            { id: 'a1', locationId: 'a' },
            { id: 'a2', locationId: 'a' },
            { id: 'b1', locationId: 'b' },
            { id: 'c1', locationId: 'c' },
            { id: 'd1', locationId: 'd' },
        ];
        expect(diversifyVouchersByLocation(candidates, 4).map(({ id }) => id)).toEqual(['a1', 'b1', 'c1', 'd1']);
        expect(diversifyVouchersByLocation(candidates.slice(0, 3), 3).map(({ id }) => id)).toEqual(['a1', 'b1', 'a2']);
    });

    it('uses deterministic sort orders for catalog and Explore', () => {
        expect(getPublicVoucherSort('newest')).toEqual({ createdAt: -1, _id: 1 });
        expect(getPublicVoucherSort('ending_soon')).toEqual({
            claimEndAt: 1, claimedCount: -1, createdAt: -1, _id: 1,
        });
    });
});
