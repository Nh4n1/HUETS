import type { AiItineraryRequest } from '../schemas/aiItinerary.schema.ts';
import type { PlannerCandidate } from './aiItineraryPlanner.service.ts';
import type { PlanningIssue } from './itineraryScheduleValidator.service.ts';

const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export const checkPlanningFeasibility = (
    request: AiItineraryRequest,
    mustVisitLocations: PlannerCandidate[],
) => {
    const issues: PlanningIssue[] = [];
    const found = new Set(mustVisitLocations.map(({ id }) => id));
    for (const locationId of request.mustVisitLocationIds) {
        if (!found.has(locationId)) {
            issues.push({
                level: 'error', code: 'LOCATION_UNAVAILABLE', locationId,
                message: 'Một địa điểm Must Visit không tồn tại hoặc không còn công khai.',
            });
        }
    }
    for (const location of mustVisitLocations) {
        const availability = location.openingAvailability;
        if (request.startDate && availability.length > 0
            && availability.every(({ status }) => status === 'closed')) {
            issues.push({
                level: 'error', code: 'MUST_VISIT_TIME_CONFLICT', locationId: location.id,
                message: `${location.name} không hoạt động trong các ngày của chuyến đi.`,
            });
        }
    }
    const availableMinutes = request.durationDays
        * (minutes(request.dailyTimeRange.end) - minutes(request.dailyTimeRange.start));
    const requiredMinutes = mustVisitLocations.reduce(
        (total, location) => total + location.recommendedVisitMinutes,
        0,
    );
    if (requiredMinutes > availableMinutes) {
        issues.push({
            level: 'error', code: 'MUST_VISIT_TIME_CONFLICT',
            message: 'Các địa điểm Must Visit cần nhiều thời gian hơn tổng thời gian chuyến đi.',
        });
    }
    return issues;
};
