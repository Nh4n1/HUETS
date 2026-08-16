export interface AIPlannerCreatePlanInput {
    trip: {
        durationDays: number;
        dailyTimeRange: { start: string; end: string };
        transport: string;
        pace: string;
    };
    normalizedPreferences: {
        categoryCodes: string[];
        requiredTagCodes: string[];
        preferredTagCodes: string[];
        avoidTagCodes: string[];
    };
    mustVisitLocations: Array<{ id: string; name: string }>;
    candidates: Array<{
        id: string;
        name: string;
        categoryCode: string;
        tagCodes: string[];
        rating: number;
        coordinates: [number, number];
    }>;
}

export interface AIPlannerRepairPlanInput {
    originalPlan: AIPlannerOutput;
    validationErrors: string[];
    candidates: Array<{ id: string; name: string }>;
}

export interface AIPlannerOutputDayItem {
    locationId: string;
    suggestedStartTime: string; // HH:mm
    durationMinutes: number;
    note?: string;
}

export interface AIPlannerOutputDay {
    dayNumber: number;
    items: AIPlannerOutputDayItem[];
}

export interface AIPlannerOutput {
    title: string;
    days: AIPlannerOutputDay[];
    warnings?: string[];
}

export interface AIPlannerClient {
    createPlan(input: AIPlannerCreatePlanInput): Promise<AIPlannerOutput>;
    repairPlan(input: AIPlannerRepairPlanInput): Promise<AIPlannerOutput>;
}
