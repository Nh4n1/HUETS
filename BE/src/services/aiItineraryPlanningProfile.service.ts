import type { ILocation } from '../models/location.model.ts';
import { categoryPlanningDefaults, GLOBAL_FALLBACK_VISIT_MINUTES } from '../config/categoryPlanningDefaults.ts';

export class PlanningProfileService {
    static getRecommendedVisitMinutes(location: Partial<ILocation>): number {
        if (location.categoryCode && categoryPlanningDefaults[location.categoryCode]) {
            const config = categoryPlanningDefaults[location.categoryCode];
            if (config?.recommendedVisitMinutes) {
                return config.recommendedVisitMinutes;
            }
        }

        return GLOBAL_FALLBACK_VISIT_MINUTES;
    }
}
