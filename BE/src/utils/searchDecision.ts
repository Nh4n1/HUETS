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
  // Khoảng cách / vị trí
  /\bgan\b/,
  /\bgan toi\b/,
  /\bgan day\b/,
  /\bquanh day\b/,
  /\bxung quanh\b/,
  /\btrong vong\b/,
  /\bban kinh\b/,
  /\bcach\b.*\b\d+(?:[.,]\d+)?\s*(?:km|m)\b/,
  /\bkhong qua\b.*\b\d+(?:[.,]\d+)?\s*(?:km|m)\b/,

  // Yêu cầu / điều kiện
  /\bphai co\b/,
  /\bcan co\b/,
  /\bbat buoc\b/,
  /\bkhong the thieu\b/,
  /\bchi chon\b/,
  /\bkhong chon\b/,
  /\btranh\b/,
  /\bu tiên\b/,       // Nếu chưa normalize tiếng Việt
  /\buu tien\b/,
  /\btot nhat\b/,

  // Thời gian
  /\bmo cua\b/,
  /\bdong cua\b/,
  /\bcon mo cua\b/,
  /\bmo cua den\b/,
  /\b24\/7\b/,
  /\bhom nay\b/,
  /\bngay mai\b/,
  /\btoi nay\b/,
  /\bsang nay\b/,
  /\btrua nay\b/,
  /\bchieu nay\b/,
  /\bcuoi tuan\b/,
  /\bbuoi sang\b/,
  /\bbuoi trua\b/,
  /\bbuoi chieu\b/,
  /\bbuoi toi\b/,
  /\btruoc\b.*\b\d{1,2}(?::\d{2})?\s*(?:h|gio)\b/,
  /\bsau\b.*\b\d{1,2}(?::\d{2})?\s*(?:h|gio)\b/,

  // Người đi cùng / đối tượng
  /\bdi cung\b/,
  /\bdi voi\b/,
  /\bcho gia dinh\b/,
  /\bcho tre em\b/,
  /\bcho cap doi\b/,
  /\bcho nhom\b/,
  /\bmot minh\b/,
  /\bco nguoi lon tuoi\b/,

  // Giá / ngân sách
  /\bgia re\b/,
  /\bbinh dan\b/,
  /\bngan sach\b/,
  /\bduoi\b.*\b\d+(?:[.,]\d+)?\s*(?:k|nghin|trieu|vnd)\b/,
  /\bkhong qua\b.*\b\d+(?:[.,]\d+)?\s*(?:k|nghin|trieu|vnd)\b/,

  // Tiện ích
  /\bco cho dau xe\b/,
  /\bco wifi\b/,
  /\bco dieu hoa\b/,
  /\bco phong rieng\b/,
  /\bdat cho\b/,
  /\bmang ve\b/,
  /\bgiao hang\b/,
  /\bthanh toan the\b/,
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
