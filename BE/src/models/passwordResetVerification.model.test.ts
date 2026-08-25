import { describe, expect, it } from 'vitest';
import PasswordResetVerification from './passwordResetVerification.model.ts';

describe('PasswordResetVerification model', () => {
    it('defines unique email, user, and TTL indexes', () => {
        const indexes = PasswordResetVerification.schema.indexes();

        expect(indexes).toEqual(expect.arrayContaining([
            [{ normalizedEmail: 1 }, expect.objectContaining({ unique: true })],
            [{ userId: 1 }, expect.any(Object)],
            [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
        ]));
    });
});
