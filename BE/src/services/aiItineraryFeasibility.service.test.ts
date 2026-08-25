import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import type { AiItineraryRequest } from '../schemas/aiItinerary.schema.ts';
import type { PlannerCandidate } from './aiItineraryPlanner.service.ts';
import { checkPlanningFeasibility } from './aiItineraryFeasibility.service.ts';

const id = new Types.ObjectId().toString();
const request: AiItineraryRequest = {
    durationDays: 2,
    startDate: '2026-08-10',
    dailyTimeRange: { start: '08:00', end: '18:00' },
    pace: 'balanced',
    preferences: { preferredCategoryCodes: ['museum_cultural'] },
    mustVisitLocationIds: [id],
};
const candidate = (availability: PlannerCandidate['openingAvailability']): PlannerCandidate => ({
    id, name: 'Bảo tàng', categoryCode: 'museum_cultural', tagCodes: [], averageRating: 4,
    recommendedVisitMinutes: 90, openingAvailability: availability,
    openingHours: { status: 'scheduled', periods: [] },
});

describe('AI itinerary feasibility', () => {
    it('allows a Must Visit closed on day 1 but open on day 2', () => {
        expect(checkPlanningFeasibility(request, [candidate([
            { dayNumber: 1, status: 'closed' }, { dayNumber: 2, status: 'open' },
        ])])).toEqual([]);
    });

    it('rejects a Must Visit closed for the whole trip before planning', () => {
        expect(checkPlanningFeasibility(request, [candidate([
            { dayNumber: 1, status: 'closed' }, { dayNumber: 2, status: 'closed' },
        ])])[0]).toMatchObject({ code: 'MUST_VISIT_TIME_CONFLICT', locationId: id });
    });

    it('rejects a missing public-valid Must Visit', () => {
        expect(checkPlanningFeasibility(request, [])[0]).toMatchObject({ code: 'LOCATION_UNAVAILABLE', locationId: id });
    });
});
