import { afterEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { aiSearchConfig } from '../config/aiSearch.config.ts';
import type { AiItineraryRequest } from '../schemas/aiItinerary.schema.ts';
import { generateAiItineraryPlan, type PlannerCandidate } from './aiItineraryPlanner.service.ts';

const originalProvider = aiSearchConfig.provider;

describe('AI itinerary planner', () => {
    afterEach(() => { aiSearchConfig.provider = originalProvider; });

    it('schedules a Must Visit on day 2 when it is closed on day 1', async () => {
        aiSearchConfig.provider = 'mock';
        const id = new Types.ObjectId().toString();
        const request: AiItineraryRequest = {
            durationDays: 2,
            startDate: '2026-08-10',
            dailyTimeRange: { start: '08:00', end: '18:00' },
            pace: 'relaxed',
            preferences: { preferredCategoryCodes: ['museum_cultural'] },
            mustVisitLocationIds: [id],
        };
        const candidate: PlannerCandidate = {
            id,
            name: 'Bảo tàng',
            categoryCode: 'museum_cultural',
            tagCodes: [],
            averageRating: 4,
            recommendedVisitMinutes: 90,
            openingAvailability: [
                { dayNumber: 1, status: 'closed' },
                { dayNumber: 2, status: 'open' },
            ],
            openingHours: {
                status: 'scheduled',
                periods: [{ dayOfWeek: 2, ranges: [{ open: '09:00', close: '17:00' }] }],
            },
        };

        const result = await generateAiItineraryPlan(request, [candidate]);
        expect(result.days[0]?.items).toEqual([]);
        expect(result.days[1]?.items[0]).toMatchObject({ locationId: id, suggestedStartTime: '09:00' });
    });
});
