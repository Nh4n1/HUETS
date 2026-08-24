import { z } from 'zod';
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from '../models/feedback.model.ts';

const optionalTrimmedString = (maxLength: number) => z.union([
    z.string().trim().max(maxLength),
    z.null(),
]).optional();

export const createFeedbackSchema = z.object({
    type: z.enum(FEEDBACK_TYPES),
    title: z.string().trim().min(5).max(150),
    description: z.string().trim().min(10).max(3000),
    contactEmail: z.union([z.email(), z.literal(''), z.null()]).optional(),
    imageAssetTokens: z.array(z.string().min(1)).max(3).default([]),
}).strict();

export const updateFeedbackSchema = z.object({
    status: z.enum(FEEDBACK_STATUSES),
    adminNote: optionalTrimmedString(2000),
}).strict();

export const adminFeedbackQuerySchema = z.object({
    status: z.enum(FEEDBACK_STATUSES).optional(),
    type: z.enum(FEEDBACK_TYPES).optional(),
    q: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
