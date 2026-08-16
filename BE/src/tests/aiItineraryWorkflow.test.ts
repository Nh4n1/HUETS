import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIItineraryPlanValidatorService } from '../services/aiItineraryPlanValidator.service.ts';
import { AIItineraryAlternativesService } from '../services/aiItineraryAlternatives.service.ts';
import { AIItineraryPlannerService } from '../services/aiItineraryPlanner.service.ts';
import type { ILocation } from '../models/location.model.ts';
import type { AIPlannerOutput } from '../integrations/ai/aiClient.interface.ts';
import mongoose from 'mongoose';

describe('AI Itinerary Plan Validation, Repair & Alternatives (Steps 7, 8, 10, 11)', () => {
    let mockCandidates: ILocation[];
    let loc1Id: string;
    let loc2Id: string;

    beforeEach(() => {
        loc1Id = new mongoose.Types.ObjectId().toString();
        loc2Id = new mongoose.Types.ObjectId().toString();

        mockCandidates = [
            {
                _id: new mongoose.Types.ObjectId(loc1Id),
                name: 'Đại Nội Huế',
                categoryCode: 'historical_site',
                tagCodes: ['sightseeing'],
                ratingSummary: { average: 4.8, count: 100 },
                geo: { type: 'Point', coordinates: [107.5776, 16.4695] },
                status: 'approved',
            } as unknown as ILocation,
            {
                _id: new mongoose.Types.ObjectId(loc2Id),
                name: 'Chùa Thiên Mụ',
                categoryCode: 'religious_site',
                tagCodes: ['sightseeing', 'quiet'],
                ratingSummary: { average: 4.9, count: 200 },
                geo: { type: 'Point', coordinates: [107.5453, 16.4534] },
                status: 'approved',
            } as unknown as ILocation,
        ];
    });

    it('validatePlan should pass for a valid AI plan', () => {
        const validPlan: AIPlannerOutput = {
            title: 'Chuyến đi Huế 2 ngày',
            days: [
                {
                    dayNumber: 1,
                    items: [
                        { locationId: loc1Id, suggestedStartTime: '08:30', durationMinutes: 90 },
                    ],
                },
                {
                    dayNumber: 2,
                    items: [
                        { locationId: loc2Id, suggestedStartTime: '09:00', durationMinutes: 60 },
                    ],
                },
            ],
        };

        const validation = AIItineraryPlanValidatorService.validatePlan(validPlan, 2, mockCandidates, [loc1Id]);
        expect(validation.isValid).toBe(true);
        expect(validation.errors.length).toBe(0);
    });

    it('validatePlan should report errors when must visit location is missing or durationDays mismatch', () => {
        const invalidPlan: AIPlannerOutput = {
            title: 'Lịch trình thiếu điểm',
            days: [
                {
                    dayNumber: 1,
                    items: [
                        { locationId: loc1Id, suggestedStartTime: '08:30', durationMinutes: 90 },
                    ],
                },
            ],
        };

        // Expected 2 days, but plan only has 1 day & missing loc2Id as must visit
        const validation = AIItineraryPlanValidatorService.validatePlan(invalidPlan, 2, mockCandidates, [loc1Id, loc2Id]);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('AIItineraryPlannerService should return mock plan when provider is mock or fallback active', async () => {
        const plannerService = new AIItineraryPlannerService();
        const plan = await plannerService.createPlan({
            trip: {
                durationDays: 2,
                dailyTimeRange: { start: '08:00', end: '20:00' },
                transport: 'motorcycle',
                pace: 'moderate',
            },
            normalizedPreferences: {
                categoryCodes: ['historical_site'],
                requiredTagCodes: [],
                preferredTagCodes: [],
                avoidTagCodes: [],
            },
            mustVisitLocations: [{ id: loc1Id, name: 'Đại Nội Huế' }],
            candidates: [
                {
                    id: loc1Id,
                    name: 'Đại Nội Huế',
                    categoryCode: 'historical_site',
                    tagCodes: [],
                    rating: 4.8,
                    coordinates: [107.5776, 16.4695],
                },
            ],
        });

        expect(plan.title).toBeDefined();
        expect(plan.days.length).toBe(2);
    });
});
