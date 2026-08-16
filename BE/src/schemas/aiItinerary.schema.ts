import { z } from 'zod';
import { AI_ITINERARY_CONSTANTS } from '../config/aiItinerary.config.ts';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const objectIdSchema = z.string()
    .trim()
    .regex(objectIdPattern, 'ObjectID không hợp lệ.');

export const dailyTimeRangeSchema = z.object({
    start: z.string().regex(timePattern, 'Định dạng giờ bắt đầu phải là HH:mm.'),
    end: z.string().regex(timePattern, 'Định dạng giờ kết thúc phải là HH:mm.'),
}).strict().superRefine((range, ctx) => {
    if (range.start >= range.end) {
        ctx.addIssue({
            code: 'custom',
            path: ['end'],
            message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu trong ngày.',
        });
    }
});

export const originSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('current_location'),
        coordinates: z.tuple([
            z.number().min(-180).max(180),
            z.number().min(-90).max(90),
        ]),
    }).strict(),
    z.object({
        type: z.literal('map_point'),
        coordinates: z.tuple([
            z.number().min(-180).max(180),
            z.number().min(-90).max(90),
        ]),
    }).strict(),
    z.object({
        type: z.literal('location_reference'),
        locationId: objectIdSchema,
    }).strict(),
]);

export const preferencesSchema = z.object({
    categoryCodes: z.array(z.string().trim().min(1)).max(20).default([]),
    requiredTagCodes: z.array(z.string().trim().min(1)).max(20).default([]),
    preferredTagCodes: z.array(z.string().trim().min(1)).max(20).default([]),
    avoidTagCodes: z.array(z.string().trim().min(1)).max(20).default([]),
    priceLevels: z.array(z.number().int().min(1).max(4)).max(4).default([]),
}).strict().superRefine((pref, ctx) => {
    const requiredSet = new Set(pref.requiredTagCodes);

    for (const code of pref.preferredTagCodes) {
        if (requiredSet.has(code)) {
            ctx.addIssue({
                code: 'custom',
                path: ['preferredTagCodes'],
                message: `Tag "${code}" không thể vừa bắt buộc vừa ưu tiên.`,
            });
        }
    }

    for (const code of pref.avoidTagCodes) {
        if (requiredSet.has(code)) {
            ctx.addIssue({
                code: 'custom',
                path: ['avoidTagCodes'],
                message: `Tag "${code}" không thể vừa bắt buộc vừa loại trừ (avoid).`,
            });
        }
    }

    if (new Set(pref.requiredTagCodes).size !== pref.requiredTagCodes.length) {
        ctx.addIssue({
            code: 'custom',
            path: ['requiredTagCodes'],
            message: 'requiredTagCodes không được chứa mã trùng lặp.',
        });
    }

    if (new Set(pref.preferredTagCodes).size !== pref.preferredTagCodes.length) {
        ctx.addIssue({
            code: 'custom',
            path: ['preferredTagCodes'],
            message: 'preferredTagCodes không được chứa mã trùng lặp.',
        });
    }

    if (new Set(pref.avoidTagCodes).size !== pref.avoidTagCodes.length) {
        ctx.addIssue({
            code: 'custom',
            path: ['avoidTagCodes'],
            message: 'avoidTagCodes không được chứa mã trùng lặp.',
        });
    }
});

export const createAIItineraryPlanRequestSchema = z.object({
    durationDays: z.number().int().min(1).max(AI_ITINERARY_CONSTANTS.MAX_ITINERARY_DAYS),
    startDate: z.string().regex(datePattern, 'Định dạng ngày bắt đầu phải là YYYY-MM-DD.').nullable().optional(),
    dailyTimeRange: dailyTimeRangeSchema.default({ start: '08:00', end: '20:00' }),
    origin: originSchema,
    transport: z.enum(['motorcycle', 'car', 'walking', 'bicycle']).default('motorcycle'),
    pace: z.enum(['relaxed', 'moderate', 'fast']).default('moderate'),
    preferences: preferencesSchema.default({
        categoryCodes: [],
        requiredTagCodes: [],
        preferredTagCodes: [],
        avoidTagCodes: [],
        priceLevels: [],
    }),
    mustVisitLocationIds: z.array(objectIdSchema).max(10).default([]),
    preferenceText: z.string().trim().max(500, 'Mô tả sở thích tối đa 500 ký tự.').default(''),
}).strict().superRefine((req, ctx) => {
    if (new Set(req.mustVisitLocationIds).size !== req.mustVisitLocationIds.length) {
        ctx.addIssue({
            code: 'custom',
            path: ['mustVisitLocationIds'],
            message: 'mustVisitLocationIds không được chứa địa điểm trùng lặp.',
        });
    }
});

export type DailyTimeRangeInput = z.infer<typeof dailyTimeRangeSchema>;
export type OriginInput = z.infer<typeof originSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type CreateAIItineraryPlanRequest = z.infer<typeof createAIItineraryPlanRequestSchema>;
