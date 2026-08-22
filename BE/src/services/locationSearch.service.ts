import { aiSearchConfig } from '../config/aiSearch.config.ts';
import { locationSearchProtectionConfig } from '../config/locationSearchProtection.config.ts';
import { normalizeSearchText } from '../helpers/text.helper.ts';
import Location from '../models/location.model.ts';
import { tagGroups } from '../reference/reference.data.ts';
import {
    executeLocationSearchRequestSchema,
    initialLocationSearchRequestSchema,
    type InitialLocationSearchRequest,
    type SearchInterpretation,
    type SearchPlan,
} from '../schemas/locationSearch.schema.ts';
import { decideAfterExactLookup, type SearchDecision } from '../utils/searchDecision.ts';
import type { AiSearchParser } from './aiSearchParser.service.ts';
import { GeminiSearchParser } from './geminiSearchParser.service.ts';
import { getPublicLocations } from './location.service.ts';
import { executeSearchPlan } from './locationSearchExecutor.service.ts';
import { MockSearchParser } from './mockSearchParser.service.ts';
import { getSearchCatalog } from './searchCatalog.service.ts';
import { validateSearchPlan } from './searchPlanValidator.service.ts';

type ExactMatch = { type: 'name' | 'alias' };
type CacheStatus = 'hit' | 'miss' | 'shared';

interface ParsedSearchPlan {
    criteria: SearchPlan;
    interpretation: SearchInterpretation;
    usedFallback: boolean;
}

interface SearchPlanCacheEntry extends ParsedSearchPlan {
    expiresAt: number;
}

const searchPlanCache = new Map<string, SearchPlanCacheEntry>();
const searchesInFlight = new Map<string, Promise<ParsedSearchPlan>>();

const normalizedTagPhrases = tagGroups.flatMap((group) => group.tags)
    .filter((tag) => tag.isActive).map((tag) => normalizeSearchText(tag.name));

const findExactMatch = async (normalizedQuery: string): Promise<ExactMatch | null> => {
    const exactName = await Location.findOne({ status: 'approved', isDeleted: { $ne: true }, normalizedName: normalizedQuery })
        .select({ _id: 1 }).lean();
    if (exactName) return { type: 'name' };
    const exactAlias = await Location.findOne({ status: 'approved', isDeleted: { $ne: true }, 'aliases.normalizedValue': normalizedQuery })
        .select({ _id: 1 }).lean();
    return exactAlias ? { type: 'alias' } : null;
};

export const decideSearchPath = async (query: string): Promise<SearchDecision> => {
    const normalizedQuery = normalizeSearchText(query);
    const exactMatch = await findExactMatch(normalizedQuery);
    if (exactMatch?.type === 'name') return { path: 'fast', reason: 'exact_name' };
    if (exactMatch?.type === 'alias') return { path: 'fast', reason: 'exact_alias' };
    return decideAfterExactLookup(normalizedQuery, normalizedTagPhrases);
};

const executeBasicSearch = (input: InitialLocationSearchRequest) => getPublicLocations({
    q: input.query, page: String(input.page), pageSize: String(input.pageSize),
});

const cacheKeyFor = (query: string) => [
    aiSearchConfig.provider,
    aiSearchConfig.geminiModel,
    normalizeSearchText(query),
].join(':');

const parseSearchPlan = async (query: string): Promise<ParsedSearchPlan> => {
    const catalog = await getSearchCatalog();
    let usedFallback = false;
    let parser: AiSearchParser = aiSearchConfig.provider === 'gemini'
        ? new GeminiSearchParser() : new MockSearchParser();
    let parsed;

    try {
        parsed = await parser.parse({ query, ...catalog });
    } catch (error) {
        if (aiSearchConfig.provider !== 'gemini' || !aiSearchConfig.fallbackToMock) throw error;
        usedFallback = true;
        parser = new MockSearchParser();
        parsed = await parser.parse({ query, ...catalog });
    }

    const validated = await validateSearchPlan(parsed);
    return { ...validated, usedFallback };
};

const resolveSearchPlan = async (query: string): Promise<ParsedSearchPlan & { cacheStatus: CacheStatus }> => {
    const key = cacheKeyFor(query);
    const now = Date.now();
    const cached = searchPlanCache.get(key);

    if (cached && cached.expiresAt > now) {
        searchPlanCache.delete(key);
        searchPlanCache.set(key, cached);
        return { ...cached, cacheStatus: 'hit' };
    }
    if (cached) searchPlanCache.delete(key);

    const existingRequest = searchesInFlight.get(key);
    if (existingRequest) return { ...await existingRequest, cacheStatus: 'shared' };

    const request = parseSearchPlan(query);
    searchesInFlight.set(key, request);
    try {
        const parsed = await request;
        const ttlMs = parsed.usedFallback
            ? locationSearchProtectionConfig.fallbackCacheTtlMs
            : locationSearchProtectionConfig.cacheTtlMs;
        searchPlanCache.set(key, { ...parsed, expiresAt: now + ttlMs });
        while (searchPlanCache.size > locationSearchProtectionConfig.cacheMaxEntries) {
            const oldestKey = searchPlanCache.keys().next().value;
            if (oldestKey === undefined) break;
            searchPlanCache.delete(oldestKey);
        }
        return { ...parsed, cacheStatus: 'miss' };
    } finally {
        searchesInFlight.delete(key);
    }
};

export const clearLocationSearchCache = () => {
    searchPlanCache.clear();
    searchesInFlight.clear();
};

export const searchLocations = async (rawInput: unknown) => {
    const input = initialLocationSearchRequestSchema.parse(rawInput);
    const decision = await decideSearchPath(input.query);

    if (decision.path === 'ai') {
        try {
            const { criteria, interpretation, usedFallback, cacheStatus } = await resolveSearchPlan(input.query);
            const result = await executeSearchPlan(criteria, input.page, input.pageSize);
            return {
                data: {
                    status: usedFallback ? 'ai_unavailable' as const
                        : result.meta.total ? 'success' as const : 'no_exact_match' as const,
                    query: input.query,
                    criteria,
                    interpretation,
                    locations: result.data,
                    ...(usedFallback ? { notice: 'Gemini tạm thời không khả dụng. Kết quả được phân tích bằng chế độ demo.' } : {}),
                },
                meta: result.meta,
                debug: { ...decision, provider: aiSearchConfig.provider, usedFallback, cache: cacheStatus },
            };
        } catch (error) {
            const result = await executeBasicSearch(input);
            return {
                data: {
                    status: 'ai_unavailable' as const,
                    query: input.query,
                    criteria: null,
                    interpretation: null,
                    locations: result.data,
                    notice: 'Tìm kiếm nâng cao tạm thời không khả dụng. Đang dùng tìm kiếm cơ bản.',
                },
                meta: result.meta,
                debug: { ...decision, provider: aiSearchConfig.provider, error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }

    const result = await executeBasicSearch(input);
    return {
        data: { status: 'success' as const, query: input.query, criteria: null, interpretation: null, locations: result.data },
        meta: result.meta,
        debug: decision,
    };
};

export const executeLocationSearch = async (rawInput: unknown) => {
    const input = executeLocationSearchRequestSchema.parse(rawInput);
    const { criteria, interpretation } = await validateSearchPlan(input.criteria);
    const result = await executeSearchPlan(criteria, input.page, input.pageSize);
    return {
        data: {
            status: result.meta.total ? 'success' as const : 'no_exact_match' as const,
            criteria,
            interpretation,
            locations: result.data,
        },
        meta: result.meta,
    };
};
