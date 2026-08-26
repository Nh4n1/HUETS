import { describe, expect, it } from 'vitest';
import { generateFriendlyCode, generateOpaqueToken, hashOpaqueToken, normalizeFriendlyCode } from './opaqueToken.helper.ts';

describe('opaque token helpers', () => {
    it('generates high-entropy opaque tokens and deterministic hashes', () => {
        const first = generateOpaqueToken();
        const second = generateOpaqueToken();
        expect(first).not.toBe(second);
        expect(first.length).toBeGreaterThan(32);
        expect(hashOpaqueToken(first)).toBe(hashOpaqueToken(first));
        expect(hashOpaqueToken(first)).not.toBe(hashOpaqueToken(second));
    });

    it('normalizes display codes without ambiguous formatting', () => {
        expect(normalizeFriendlyCode(' ht-7k9 p2x ')).toBe('HT7K9P2X');
        expect(generateFriendlyCode(8, 'HTD')).toMatch(/^HTD[23456789A-HJ-NP-Z]{8}$/);
    });
});
