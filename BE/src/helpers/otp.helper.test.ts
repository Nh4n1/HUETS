import { describe, expect, it } from 'vitest';
import { generateSixDigitOtp } from './otp.helper.ts';

describe('generateSixDigitOtp', () => {
    it('always returns exactly six digits', () => {
        for (let index = 0; index < 100; index += 1) {
            expect(generateSixDigitOtp()).toMatch(/^\d{6}$/);
        }
    });
});
