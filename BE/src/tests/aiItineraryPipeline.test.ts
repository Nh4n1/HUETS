import { describe, it, expect } from 'vitest';
import { PreferenceParserService } from '../services/aiItineraryPreferenceParser.service.ts';
import { TravelEstimateService } from '../services/aiItineraryTravelEstimate.service.ts';
import { PlanningProfileService } from '../services/aiItineraryPlanningProfile.service.ts';
import { CandidateRankingService } from '../services/aiItineraryCandidateRanking.service.ts';
import { TimelineService } from '../services/aiItineraryTimeline.service.ts';
import type { ILocation } from '../models/location.model.ts';
import mongoose from 'mongoose';

describe('AI Itinerary Pipeline Services (Flat BE/src/services structure)', () => {
    it('PreferenceParserService should normalize explicit preferences and resolve conflicts', () => {
        const input = {
            categoryCodes: ['historical_site', 'historical_site'],
            requiredTagCodes: ['sightseeing', 'family'],
            preferredTagCodes: ['sightseeing', 'photography'],
            avoidTagCodes: ['nightlife'],
            priceLevels: [1, 2],
        };

        const result = PreferenceParserService.normalize(input);
        expect(result.categoryCodes).toEqual(['historical_site']);
        expect(result.requiredTagCodes).toEqual(['sightseeing', 'family']);
        expect(result.preferredTagCodes).toEqual(['photography']);
        expect(result.avoidTagCodes).toEqual(['nightlife']);
    });

    it('TravelEstimateService should accurately calculate Haversine distance and travel time', () => {
        const hueCitadel: [number, number] = [107.5776, 16.4695];
        const thienMuPagoda: [number, number] = [107.5453, 16.4534];

        const distKm = TravelEstimateService.calculateHaversineDistanceKm(hueCitadel, thienMuPagoda);
        expect(distKm).toBeGreaterThan(3);
        expect(distKm).toBeLessThan(6);

        const travelMins = TravelEstimateService.estimateTravelMinutes(hueCitadel, thienMuPagoda, 'motorcycle');
        expect(travelMins).toBeGreaterThanOrEqual(5);
    });

    it('PlanningProfileService should return category recommended visit time or fallback', () => {
        const historicalLocation = { categoryCode: 'historical_site' } as Partial<ILocation>;
        expect(PlanningProfileService.getRecommendedVisitMinutes(historicalLocation)).toBe(90);

        const unknownLocation = { categoryCode: 'unknown_cat' } as Partial<ILocation>;
        expect(PlanningProfileService.getRecommendedVisitMinutes(unknownLocation)).toBe(60);
    });

    it('CandidateRankingService should rank candidates deterministically with score boost for must visits', () => {
        const locId1 = new mongoose.Types.ObjectId().toString();
        const locId2 = new mongoose.Types.ObjectId().toString();

        const candidates = [
            {
                _id: locId1,
                name: 'Đại Nội Huế',
                categoryCode: 'historical_site',
                tagCodes: ['sightseeing', 'photography'],
                ratingSummary: { average: 4.8, count: 100 },
                geo: { type: 'Point', coordinates: [107.5776, 16.4695] },
            } as unknown as ILocation,
            {
                _id: locId2,
                name: 'Chùa Thiên Mụ',
                categoryCode: 'religious_site',
                tagCodes: ['sightseeing', 'quiet'],
                ratingSummary: { average: 4.9, count: 200 },
                geo: { type: 'Point', coordinates: [107.5453, 16.4534] },
            } as unknown as ILocation,
        ];

        const preferences = {
            categoryCodes: ['historical_site'],
            requiredTagCodes: ['sightseeing'],
            preferredTagCodes: ['photography'],
            avoidTagCodes: [],
            priceLevels: [],
        };

        const originCoords: [number, number] = [107.5905, 16.4637];

        const ranked = CandidateRankingService.rank({
            candidates,
            preferences,
            mustVisitLocationIds: [locId2],
            originCoordinates: originCoords,
        });

        expect(ranked[0].location._id.toString()).toBe(locId2);
        expect(ranked[0].isMustVisit).toBe(true);
    });

    it('TimelineService should calculate start and end times and detect schedule warnings', () => {
        const locId = new mongoose.Types.ObjectId().toString();
        const mockLocation = {
            _id: locId,
            name: 'Đại Nội Huế',
            categoryCode: 'historical_site',
            geo: { type: 'Point', coordinates: [107.5776, 16.4695] },
            openingHours: {
                status: 'scheduled',
                periods: [
                    {
                        dayOfWeek: 1,
                        ranges: [{ open: '07:30', close: '17:00' }],
                    },
                ],
            },
        } as unknown as ILocation;

        const timeline = TimelineService.calculateDayTimeline(
            1,
            [{ location: mockLocation }],
            [107.5905, 16.4637],
            { start: '08:00', end: '17:00' },
            'motorcycle',
            1,
        );

        expect(timeline.items.length).toBe(1);
        expect(timeline.items[0].locationName).toBe('Đại Nội Huế');
        expect(timeline.items[0].suggestedStartTime).toBeDefined();
        expect(timeline.items[0].suggestedEndTime).toBeDefined();
    });
});
