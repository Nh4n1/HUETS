import { describe, expect, it } from 'vitest';
import { voucherInputSchema } from './voucher.schema.ts';

const validVoucher = {
    title: 'Giảm giá trải nghiệm Huế',
    description: 'Ưu đãi dành cho khách HueTrip.',
    benefit: { type: 'percentage', value: 20 },
    terms: 'Áp dụng cho hóa đơn từ 100.000 đồng và không cộng dồn.',
    claimStartAt: '2026-09-01T00:00:00.000Z',
    claimEndAt: '2026-09-10T00:00:00.000Z',
    redeemUntil: '2026-09-15T00:00:00.000Z',
    totalQuantity: 50,
};

describe('voucher schema', () => {
    it('accepts the MVP percentage benefit and ordered windows', () => {
        expect(voucherInputSchema.safeParse(validVoucher).success).toBe(true);
    });

    it('does not accept a voucher-specific image field', () => {
        expect(voucherInputSchema.safeParse({
            ...validVoucher,
            imageUrl: 'https://example.com/voucher.jpg',
        }).success).toBe(false);
    });

    it('rejects percentage above 100', () => {
        expect(voucherInputSchema.safeParse({
            ...validVoucher,
            benefit: { type: 'percentage', value: 101 },
        }).success).toBe(false);
    });

    it('requires redeemUntil not earlier than claimEndAt', () => {
        expect(voucherInputSchema.safeParse({
            ...validVoucher,
            redeemUntil: '2026-09-05T00:00:00.000Z',
        }).success).toBe(false);
    });
});
