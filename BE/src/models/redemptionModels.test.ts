import { describe, expect, it } from 'vitest';
import RedemptionSession from './redemptionSession.model.ts';
import VoucherRedemption from './voucherRedemption.model.ts';

describe('redemption persistence invariants', () => {
    it('expires short-lived redemption sessions with a TTL index', () => {
        expect(RedemptionSession.schema.indexes()).toEqual(expect.arrayContaining([
            [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
        ]));
    });

    it('allows at most one successful redemption per VoucherClaim', () => {
        const claimPath = VoucherRedemption.schema.path('voucherClaimId');
        expect(claimPath.options.unique).toBe(true);
    });
});
