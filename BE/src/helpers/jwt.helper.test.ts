import { describe, expect, it } from 'vitest';
import { durationFromNow, durationToMilliseconds } from './jwt.helper.ts';

describe('JWT duration helpers', () => {
    it('converts supported duration units to milliseconds', () => {
        expect(durationToMilliseconds('15m')).toBe(15 * 60 * 1000);
        expect(durationToMilliseconds('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('creates an expiry date in the expected range', () => {
        const before = Date.now();
        const expiresAt = durationFromNow('1h').getTime();
        const after = Date.now();

        expect(expiresAt).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
        expect(expiresAt).toBeLessThanOrEqual(after + 60 * 60 * 1000);
    });

    it('rejects unsupported duration formats', () => {
        expect(() => durationToMilliseconds('1week')).toThrow('Invalid duration format');
    });
});
