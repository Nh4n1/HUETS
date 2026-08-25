import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import type { AiItineraryRequest, AiPlan } from '../schemas/aiItinerary.schema.ts';
import { validateAiPlan } from './aiItineraryPlanValidator.service.ts';

const mustId = new Types.ObjectId().toString();
const otherId = new Types.ObjectId().toString();
const request: AiItineraryRequest = {
    durationDays: 1,
    startDate: '2026-08-10',
    dailyTimeRange: { start: '08:00', end: '18:00' },
    pace: 'relaxed',
    preferences: { preferredCategoryCodes: ['historical_site'] },
    mustVisitLocationIds: [mustId],
};
const location = (id: string) => ({
    _id: id,
    name: id,
    status: 'approved',
    isDeleted: false,
    openingHours: { status: 'always_open' as const, periods: [] },
});
const validate = (plan: AiPlan, candidates = new Set([mustId, otherId])) => validateAiPlan({
    plan,
    request,
    candidateLocationIds: candidates,
    locationsById: new Map([[mustId, location(mustId)], [otherId, location(otherId)]]),
});

describe('AI itinerary plan validator', () => {
    it('keeps Must Visit as a hard constraint even for relaxed pace', () => {
        const result = validate({
            title: 'Huế', warnings: [], days: [{ dayNumber: 1, items: [
                { locationId: mustId, suggestedStartTime: '08:00', durationMinutes: 120, note: null },
                { locationId: otherId, suggestedStartTime: '10:30', durationMinutes: 90, note: null },
            ] }],
        });
        expect(result.issues.filter(({ level }) => level === 'error')).toEqual([]);
    });

    it('rejects a plan that omits a Must Visit', () => {
        const result = validate({
            title: 'Huế', warnings: [], days: [{ dayNumber: 1, items: [
                { locationId: otherId, suggestedStartTime: '08:00', durationMinutes: 90, note: null },
            ] }],
        });
        expect(result.issues).toContainEqual(expect.objectContaining({ code: 'MUST_VISIT_NOT_SCHEDULED', locationId: mustId }));
    });

    it('rejects an AI location outside its candidate set', () => {
        const result = validate({
            title: 'Huế', warnings: [], days: [{ dayNumber: 1, items: [
                { locationId: mustId, suggestedStartTime: '08:00', durationMinutes: 90, note: null },
                { locationId: otherId, suggestedStartTime: '10:00', durationMinutes: 90, note: null },
            ] }],
        }, new Set([mustId]));
        expect(result.issues).toContainEqual(expect.objectContaining({ code: 'LOCATION_UNAVAILABLE', locationId: otherId }));
    });
});
