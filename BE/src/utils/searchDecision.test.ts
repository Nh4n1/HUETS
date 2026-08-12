import { describe, expect, it } from 'vitest';
import {
    containsKnownConstraint,
    containsSemanticSignals,
    decideAfterExactLookup,
} from './searchDecision.ts';

describe('search decision', () => {
    it('detects distance and hard requirement signals', () => {
        expect(containsSemanticSignals('quan cafe gan toi trong vong 2 km')).toBe(true);
        expect(containsSemanticSignals('khach san phai co wifi')).toBe(true);
    });

    it('uses Fast Path for a simple keyword', () => {
        expect(decideAfterExactLookup('cafe')).toEqual({
            path: 'fast',
            reason: 'simple_keyword',
        });
    });

    it('uses AI Path for semantic constraints', () => {
        expect(decideAfterExactLookup('quan cafe gan toi phai co wifi')).toEqual({
            path: 'ai',
            reason: 'semantic_constraints',
        });
    });

    it('uses AI Path when a known Tag phrase appears', () => {
        expect(containsKnownConstraint(
            'quan cafe yen tinh co wi fi',
            ['yen tinh', 'co wi fi'],
        )).toBe(true);

        expect(decideAfterExactLookup(
            'quan cafe yen tinh co wi fi',
            ['yen tinh', 'co wi fi'],
        )).toEqual({
            path: 'ai',
            reason: 'semantic_constraints',
        });
    });
});
