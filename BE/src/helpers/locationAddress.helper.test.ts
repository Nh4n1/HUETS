import { describe, expect, it } from 'vitest';
import { formatLocationAddress, normalizeLocationAddressLine } from './locationAddress.helper.ts';

describe('location address helpers', () => {
    it('normalizes only surrounding and repeated whitespace', () => {
        expect(normalizeLocationAddressLine('  15   Lê Lợi\n tầng 2  ')).toBe('15 Lê Lợi tầng 2');
    });

    it('derives the canonical display address without changing stored fields', () => {
        expect(formatLocationAddress({
            address: {
                addressLine: '15 Lê Lợi',
                wardNameSnapshot: 'Phường Thuận Hóa',
            },
        })).toBe('15 Lê Lợi, Phường Thuận Hóa, Thành phố Huế');
    });
});
