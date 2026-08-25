import { describe, expect, it } from 'vitest';
import RegistrationVerification from './registrationVerification.model.ts';

describe('RegistrationVerification model', () => {
    it('defines unique email and TTL expiry indexes', () => {
        const indexes = RegistrationVerification.schema.indexes();

        expect(indexes).toEqual(expect.arrayContaining([
            [{ normalizedEmail: 1 }, expect.objectContaining({ unique: true })],
            [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
        ]));
    });
});
