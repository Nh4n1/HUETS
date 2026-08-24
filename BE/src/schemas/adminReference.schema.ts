import { z } from 'zod';

export const taxonomyCodeSchema = z.string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{1,49}$/, 'Code phải có 2-50 ký tự chữ thường, số hoặc dấu gạch dưới.');

const nameSchema = z.string().trim().min(1, 'Tên là thông tin bắt buộc.').max(100);
const sortOrderSchema = z.number().int().min(0);
const tagCodeListSchema = z.array(taxonomyCodeSchema).max(100).refine(
    (codes) => new Set(codes).size === codes.length,
    'Danh sách mã Tag không được trùng nhau.',
);

export const createCategorySchema = z.object({
    code: taxonomyCodeSchema,
    name: nameSchema,
    description: z.string().trim().max(500).optional(),
    sortOrder: sortOrderSchema.default(0),
    allowedTagCodes: tagCodeListSchema.default([]),
    recommendedTagCodes: tagCodeListSchema.default([]),
}).strict();

export const updateCategorySchema = z.object({
    name: nameSchema.optional(),
    description: z.string().trim().max(500).optional(),
    sortOrder: sortOrderSchema.optional(),
    isActive: z.boolean().optional(),
}).strict();

export const updateCategoryTagRulesSchema = z.object({
    allowedTagCodes: tagCodeListSchema,
    recommendedTagCodes: tagCodeListSchema,
}).strict();

export const createTagGroupSchema = z.object({
    code: taxonomyCodeSchema,
    name: nameSchema,
    selectionMode: z.enum(['single', 'multiple']),
    sortOrder: sortOrderSchema.default(0),
}).strict();

export const updateTagGroupSchema = z.object({
    name: nameSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
    isActive: z.boolean().optional(),
}).strict();

export const createTagSchema = z.object({
    code: taxonomyCodeSchema,
    name: nameSchema,
}).strict();

export const updateTagSchema = z.object({
    name: nameSchema.optional(),
    isActive: z.boolean().optional(),
}).strict();
