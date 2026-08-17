import { normalizeSearchText } from '../helpers/text.helper.ts';
import { searchPlanSchema, type SearchPlan } from '../schemas/locationSearch.schema.ts';
import type { AiSearchInput, AiSearchParser } from './aiSearchParser.service.ts';

const CATEGORY_ALIASES: Record<string, string[]> = {
    cafe: ['cafe', 'ca phe', 'coffee'],
    restaurant: ['nha hang', 'quan an', 'am thuc', 'an ngon'],
    hotel: ['khach san'],
    homestay_guesthouse: ['homestay', 'nha nghi', 'guesthouse'],
    historical_site: ['di tich', 'lich su'],
    religious_site: ['chua', 'nha tho', 'ton giao'],
    museum_cultural: ['bao tang', 'van hoa'],
    craft_village: ['lang nghe'],
    natural_attraction: ['thien nhien', 'canh dep'],
    market_shopping: ['cho', 'mua sam'],
    entertainment: ['giai tri', 'vui choi'],
    transport_hub: ['ben xe', 'ga tau', 'san bay', 'giao thong'],
};

const includesPhrase = (query: string, phrase: string) => query.includes(normalizeSearchText(phrase));

export class MockSearchParser implements AiSearchParser {
    async parse(input: AiSearchInput): Promise<SearchPlan> {
        const query = normalizeSearchText(input.query);
        const category = input.categories.find(({ code, name }) => (
            includesPhrase(query, name)
            || (CATEGORY_ALIASES[code] ?? []).some((alias) => includesPhrase(query, alias))
        ));
        const categoryCode = category?.code ?? null;
        const matchedTags = input.tags.filter((tag) => (
            (!categoryCode || tag.categoryCodes.includes(categoryCode)) && includesPhrase(query, tag.name)
        ));
        const hardIntent = /\b(phai co|bat buoc|nhat dinh co|can co)\b/.test(query);
        const requiredTagCodes = hardIntent ? matchedTags.map(({ code }) => code) : [];
        const preferredTagCodes = hardIntent ? [] : matchedTags.map(({ code }) => code);
        const ward = input.wards.find(({ name }) => includesPhrase(query, name));
        const asksOpenNow = /\b(dang mo cua|mo cua bay gio|bay gio con mo|con mo cua)\b/.test(query);
        const dayMatch = /\bthu\s*(2|3|4|5|6|7)|\bchu nhat\b/.exec(query);
        const timeMatch = /\b([01]?\d|2[0-3])(?:\s*(?:gio|h)|:)([0-5]\d)?\b/.exec(query);
        const openCondition = asksOpenNow
            ? { mode: 'now' as const }
            : dayMatch && timeMatch
                ? {
                    mode: 'at' as const,
                    dayOfWeek: query.includes('chu nhat') ? 7 : Number(dayMatch[1]) - 1,
                    time: `${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2] ?? '00'}`,
                }
                : null;

        return searchPlanSchema.parse({
            categoryCode,
            requiredTagCodes,
            preferredTagCodes,
            keywords: categoryCode || matchedTags.length || ward ? [] : [input.query.trim()],
            wardCode: ward?.code ?? null,
            openCondition,
            sortBy: /\b(danh gia cao|tot nhat|rating cao)\b/.test(query) ? 'rating_desc' : 'relevance',
        });
    }
}
