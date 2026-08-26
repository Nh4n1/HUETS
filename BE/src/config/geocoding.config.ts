const positiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const geocodingConfig = {
    baseUrl: process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org',
    userAgent: process.env.GEOCODING_USER_AGENT || 'HueTrip/1.0 (location contribution search)',
    timeoutMs: positiveInteger(process.env.GEOCODING_TIMEOUT_MS, 8_000),
    cacheTtlMs: positiveInteger(process.env.GEOCODING_CACHE_TTL_MS, 15 * 60 * 1_000),
    resultLimit: 5,
};
