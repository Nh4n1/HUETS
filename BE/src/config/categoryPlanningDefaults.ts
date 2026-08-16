export interface CategoryPlanningDefaults {
    recommendedVisitMinutes: number;
    suitableTimeSlots?: Array<{ start: string; end: string }>;
}

export const categoryPlanningDefaults: Record<string, CategoryPlanningDefaults> = {
    historical_site: { recommendedVisitMinutes: 90, suitableTimeSlots: [{ start: '07:30', end: '17:00' }] },
    religious_site: { recommendedVisitMinutes: 60, suitableTimeSlots: [{ start: '07:00', end: '17:30' }] },
    museum_cultural: { recommendedVisitMinutes: 90, suitableTimeSlots: [{ start: '08:00', end: '17:00' }] },
    craft_village: { recommendedVisitMinutes: 75, suitableTimeSlots: [{ start: '08:00', end: '17:00' }] },
    natural_attraction: { recommendedVisitMinutes: 120, suitableTimeSlots: [{ start: '06:00', end: '18:00' }] },
    cafe: { recommendedVisitMinutes: 60 },
    restaurant: { recommendedVisitMinutes: 75 },
    market_shopping: { recommendedVisitMinutes: 90 },
    hotel: { recommendedVisitMinutes: 30 },
    homestay_guesthouse: { recommendedVisitMinutes: 30 },
    entertainment: { recommendedVisitMinutes: 120 },
    transport_hub: { recommendedVisitMinutes: 30 },
};

export const GLOBAL_FALLBACK_VISIT_MINUTES = 60;
