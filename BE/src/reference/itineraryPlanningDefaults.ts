export const CATEGORY_VISIT_MINUTES: Record<string, number> = {
    historical_site: 120,
    religious_site: 90,
    museum_cultural: 90,
    craft_village: 90,
    natural_attraction: 120,
    cafe: 60,
    restaurant: 75,
    market_shopping: 90,
    entertainment: 120,
};

export const GLOBAL_VISIT_MINUTES = 90;

export const resolveRecommendedVisitMinutes = (categoryCode?: string | null) => (
    categoryCode ? (CATEGORY_VISIT_MINUTES[categoryCode] ?? GLOBAL_VISIT_MINUTES) : GLOBAL_VISIT_MINUTES
);
