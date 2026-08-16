import { describe, it, expect } from 'vitest';
import {
    createAIItineraryPlanRequestSchema,
    dailyTimeRangeSchema,
    originSchema,
} from '../schemas/aiItinerary.schema.ts';
import { parseAndValidateAIItineraryRequest, validateCategoryAndTagRules } from '../modules/ai-itinerary/aiItinerary.validation.ts';

describe('AI Itinerary Request Schemas & Validation', () => {
    it('should validate valid dailyTimeRange', () => {
        const result = dailyTimeRangeSchema.safeParse({ start: '08:00', end: '18:00' });
        expect(result.success).toBe(true);
    });

    it('should reject dailyTimeRange where start >= end', () => {
        const result = dailyTimeRangeSchema.safeParse({ start: '18:00', end: '08:00' });
        expect(result.success).toBe(false);
    });

    it('should validate valid origin for current_location', () => {
        const result = originSchema.safeParse({
            type: 'current_location',
            coordinates: [107.5905, 16.4637],
        });
        expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates in origin', () => {
        const result = originSchema.safeParse({
            type: 'current_location',
            coordinates: [200, 16.4637], // longitude 200 is invalid
        });
        expect(result.success).toBe(false);
    });

    it('should validate full create AI itinerary request payload', () => {
        const payload = {
            durationDays: 3,
            startDate: '2026-09-01',
            dailyTimeRange: { start: '08:00', end: '20:00' },
            origin: {
                type: 'map_point',
                coordinates: [107.5905, 16.4637],
            },
            transport: 'motorcycle',
            pace: 'moderate',
            preferences: {
                categoryCodes: ['historical_site', 'restaurant'],
                requiredTagCodes: ['sightseeing'],
                preferredTagCodes: ['photography'],
                avoidTagCodes: ['nightlife'],
                priceLevels: [1, 2],
            },
            mustVisitLocationIds: ['507f1f77bcf86cd799439011'],
            preferenceText: 'Muốn đi các điểm lịch sử và ăn món Huế',
        };

        const result = createAIItineraryPlanRequestSchema.safeParse(payload);
        expect(result.success).toBe(true);

        const categoryValidation = validateCategoryAndTagRules(payload.preferences);
        expect(categoryValidation.isValid).toBe(true);
    });

    it('should throw error when tag is both required and preferred', () => {
        const payload = {
            durationDays: 2,
            origin: { type: 'current_location', coordinates: [107.5, 16.4] },
            preferences: {
                requiredTagCodes: ['sightseeing'],
                preferredTagCodes: ['sightseeing'], // Duplicate conflict
            },
        };

        const result = createAIItineraryPlanRequestSchema.safeParse(payload);
        expect(result.success).toBe(false);
    });

    it('should reject invalid category code in parseAndValidateAIItineraryRequest', () => {
        const payload = {
            durationDays: 2,
            origin: { type: 'current_location', coordinates: [107.5, 16.4] },
            preferences: {
                categoryCodes: ['invalid_category_123'],
            },
        };

        expect(() => parseAndValidateAIItineraryRequest(payload)).toThrow();
    });
});
