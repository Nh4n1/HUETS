const positiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const locationSearchProtectionConfig = {
    windowMs: positiveInteger(process.env.SEARCH_RATE_LIMIT_WINDOW_MS, 60_000),
    aiMaxRequests: positiveInteger(process.env.SEARCH_AI_RATE_LIMIT_MAX, 10),
    executeMaxRequests: positiveInteger(process.env.SEARCH_EXECUTE_RATE_LIMIT_MAX, 60),
    cacheTtlMs: positiveInteger(process.env.SEARCH_PLAN_CACHE_TTL_MS, 15 * 60_000),
    fallbackCacheTtlMs: positiveInteger(process.env.SEARCH_FALLBACK_CACHE_TTL_MS, 60_000),
    cacheMaxEntries: positiveInteger(process.env.SEARCH_PLAN_CACHE_MAX_ENTRIES, 500),
};
