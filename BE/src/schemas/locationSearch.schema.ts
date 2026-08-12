import { z } from 'zod';

const codeSchema = z.string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Code không hợp lệ.');

const keywordSchema = z.string()
    .trim()
    .min(1)
    .max(50);

export const searchPlanSchema = z.object({
    categoryCode: codeSchema.nullable(),
    requiredTagCodes: z.array(codeSchema).max(10),
    preferredTagCodes: z.array(codeSchema).max(10),
    keywords: z.array(keywordSchema).max(5),
    wardCode: z.string().trim().min(1).max(20).nullable(),
    sortBy: z.enum(['relevance', 'rating_desc']),
}).strict().superRefine((plan, context) => {
    const requiredTags = new Set(plan.requiredTagCodes);

    for (const code of plan.preferredTagCodes) {
        if (requiredTags.has(code)) {
            context.addIssue({
                code: 'custom',
                path: ['preferredTagCodes'],
                message: `Tag ${code} không thể vừa bắt buộc vừa ưu tiên.`,
            });
        }
    }

    if (new Set(plan.requiredTagCodes).size !== plan.requiredTagCodes.length) {
        context.addIssue({
            code: 'custom',
            path: ['requiredTagCodes'],
            message: 'requiredTagCodes không được chứa giá trị trùng.',
        });
    }

    if (new Set(plan.preferredTagCodes).size !== plan.preferredTagCodes.length) {
        context.addIssue({
            code: 'custom',
            path: ['preferredTagCodes'],
            message: 'preferredTagCodes không được chứa giá trị trùng.',
        });
    }
});

export const initialLocationSearchRequestSchema = z.object({
    query: z.string()
        .trim()
        .min(1, 'Vui lòng nhập nội dung tìm kiếm.')
        .max(200, 'Nội dung tìm kiếm không được quá 200 ký tự.'),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(8),
}).strict();

export const executeLocationSearchRequestSchema = z.object({
    criteria: searchPlanSchema,
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(8),
}).strict();

export type SearchPlan = z.infer<typeof searchPlanSchema>;
export type InitialLocationSearchRequest = z.infer<typeof initialLocationSearchRequestSchema>;
export type ExecuteLocationSearchRequest = z.infer<typeof executeLocationSearchRequestSchema>;

export type LocationSearchStatus = 'success' | 'no_exact_match' | 'ai_unavailable';

export interface SearchInterpretationItem {
    code: string;
    name: string;
}

export interface SearchInterpretation {
    category: SearchInterpretationItem | null;
    requiredTags: SearchInterpretationItem[];
    preferredTags: SearchInterpretationItem[];
    ward: SearchInterpretationItem | null;
}
