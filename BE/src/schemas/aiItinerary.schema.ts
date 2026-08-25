import { z } from 'zod';
import { MAX_ITEMS_PER_DAY, MAX_ITINERARY_DAYS } from '../models/itinerary.model.ts';

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export const aiItineraryRequestSchema = z.object({
    durationDays: z.number().int().min(1).max(MAX_ITINERARY_DAYS),
    startDate: z.string().date().nullable().optional(),
    dailyTimeRange: z.object({
        start: timeSchema,
        end: timeSchema,
    }),
    pace: z.enum(['relaxed', 'balanced', 'active']).default('balanced'),
    preferences: z.object({
        preferredCategoryCodes: z.array(z.string().regex(/^[a-z0-9_]+$/)).min(1).max(10),
        preferredTagCodes: z.array(z.string().regex(/^[a-z0-9_]+$/)).max(20).optional(),
    }),
    mustVisitLocationIds: z.array(objectIdSchema).max(MAX_ITINERARY_DAYS * MAX_ITEMS_PER_DAY).default([]),
}).strict().superRefine((value, context) => {
    if (value.dailyTimeRange.end <= value.dailyTimeRange.start) {
        context.addIssue({
            code: 'custom',
            path: ['dailyTimeRange', 'end'],
            message: 'Giờ kết thúc phải sau giờ bắt đầu.',
        });
    }
    if (new Set(value.mustVisitLocationIds).size !== value.mustVisitLocationIds.length) {
        context.addIssue({ code: 'custom', path: ['mustVisitLocationIds'], message: 'Must Visit không được trùng.' });
    }
});

export const aiPlanItemSchema = z.object({
    locationId: objectIdSchema,
    suggestedStartTime: timeSchema,
    durationMinutes: z.number().int().positive().max(24 * 60),
    note: z.string().max(2000).nullable().optional(),
}).strict();

export const aiPlanSchema = z.object({
    title: z.string().trim().min(1).max(200),
    days: z.array(z.object({
        dayNumber: z.number().int().positive(),
        items: z.array(aiPlanItemSchema).max(MAX_ITEMS_PER_DAY),
    }).strict()).min(1).max(MAX_ITINERARY_DAYS),
    warnings: z.array(z.string().max(500)).max(20).default([]),
}).strict();

export const updateAiDraftSchema = z.object({
    title: z.string().trim().min(1).max(200),
    days: aiPlanSchema.shape.days,
}).strict();

export const saveAiPlanSchema = z.object({
    planId: objectIdSchema,
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    visibility: z.enum(['private', 'public']).optional(),
}).strict();

export type AiItineraryRequest = z.infer<typeof aiItineraryRequestSchema>;
export type AiPlan = z.infer<typeof aiPlanSchema>;
