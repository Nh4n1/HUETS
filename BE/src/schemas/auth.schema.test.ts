import { describe, expect, it } from 'vitest';
import {
    registerSchema,
    resendRegistrationSchema,
    verifyRegistrationSchema,
} from './auth.schema.ts';

describe('registration auth schemas', () => {
    it('trims registration fields and enforces the backend password policy', () => {
        const parsed = registerSchema.parse({
            displayName: '  Nguyễn Văn A  ',
            email: '  USER@example.com  ',
            password: 'Secret123!',
            confirmPassword: 'Secret123!',
        });

        expect(parsed.displayName).toBe('Nguyễn Văn A');
        expect(parsed.email).toBe('USER@example.com');
        expect(registerSchema.safeParse({ ...parsed, password: 'short', confirmPassword: 'short' }).success)
            .toBe(false);
        expect(registerSchema.safeParse({ ...parsed, confirmPassword: 'different' }).success).toBe(false);
    });

    it('accepts only ObjectId registration ids and six-digit codes', () => {
        const registrationId = '507f1f77bcf86cd799439011';
        expect(verifyRegistrationSchema.safeParse({ registrationId, code: '012345' }).success).toBe(true);
        expect(verifyRegistrationSchema.safeParse({ registrationId, code: '12345' }).success).toBe(false);
        expect(resendRegistrationSchema.safeParse({ registrationId: 'invalid' }).success).toBe(false);
    });
});
