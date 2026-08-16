export const AI_ITINERARY_CONSTANTS = {
    MAX_ITINERARY_DAYS: 14,
    MAX_ITEMS_PER_DAY: 20,
    MAX_CANDIDATES: 60,
    MAX_REPAIR_ATTEMPTS: 1,
    DRAFT_TTL_SECONDS: 86400, // 24 hours
} as const;

export const AI_ITINERARY_TRANSPORT_SPEED_KMH: Record<string, number> = {
    walking: 4,
    bicycle: 12,
    motorcycle: 25,
    car: 30,
};

export const GLOBAL_FALLBACK_TRAVEL_SPEED_KMH = 25;
