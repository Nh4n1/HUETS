export type SearchDecision = {
    path: 'fast' | 'ai';
    reason:
        | 'exact_name'
        | 'exact_alias'
        | 'simple_keyword'
        | 'semantic_constraints'
        | 'no_strong_match';
};

const semanticPatterns = [
    /\bgan\b/,
    /\bgan toi\b/,
    /\btrong vong\b/,
    /\bcach\b.*\bkm\b/,
    /\bphai co\b/,
    /\bbat buoc\b/,
    /\buu tien\b/,
    /\bmo cua\b/,
    /\btoi nay\b/,
    /\bbuoi sang\b/,
    /\bbuoi toi\b/,
];

export const containsSemanticSignals = (normalizedQuery: string) =>
    semanticPatterns.some((pattern) => pattern.test(normalizedQuery));

export const containsKnownConstraint = (
    normalizedQuery: string,
    normalizedConstraintPhrases: string[],
) => normalizedConstraintPhrases.some((phrase) => (
    phrase.length > 0 && ` ${normalizedQuery} `.includes(` ${phrase} `)
));

export const decideAfterExactLookup = (
    normalizedQuery: string,
    normalizedConstraintPhrases: string[] = [],
): SearchDecision => {
    if (
        containsSemanticSignals(normalizedQuery)
        || containsKnownConstraint(normalizedQuery, normalizedConstraintPhrases)
    ) {
        return { path: 'ai', reason: 'semantic_constraints' };
    }

    return { path: 'fast', reason: 'simple_keyword' };
};
