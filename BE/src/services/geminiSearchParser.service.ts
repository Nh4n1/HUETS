import { GoogleGenAI } from '@google/genai';
import { aiSearchConfig } from '../config/aiSearch.config.ts';
import { searchPlanSchema, type SearchPlan } from '../schemas/locationSearch.schema.ts';
import type { AiSearchInput, AiSearchParser } from './aiSearchParser.service.ts';

const responseJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['categoryCode', 'requiredTagCodes', 'preferredTagCodes', 'keywords', 'wardCode', 'openCondition', 'sortBy'],
    properties: {
        categoryCode: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        requiredTagCodes: { type: 'array', maxItems: 10, items: { type: 'string' } },
        preferredTagCodes: { type: 'array', maxItems: 10, items: { type: 'string' } },
        keywords: { type: 'array', maxItems: 5, items: { type: 'string' } },
        wardCode: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        openCondition: {
            anyOf: [
                { type: 'null' },
                { type: 'object', additionalProperties: false, required: ['mode'], properties: { mode: { type: 'string', enum: ['now'] } } },
                { type: 'object', additionalProperties: false, required: ['mode', 'dayOfWeek', 'time'], properties: {
                    mode: { type: 'string', enum: ['at'] },
                    dayOfWeek: { type: 'integer', minimum: 1, maximum: 7 },
                    time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
                } },
            ],
        },
        sortBy: { type: 'string', enum: ['relevance', 'rating_desc'] },
    },
};

export class GeminiSearchParser implements AiSearchParser {
    private readonly client: GoogleGenAI;

    constructor() {
        if (!aiSearchConfig.geminiApiKey) throw new Error('GEMINI_API_KEY is required for AI_PROVIDER=gemini.');
        this.client = new GoogleGenAI({ apiKey: aiSearchConfig.geminiApiKey });
    }

    async parse(input: AiSearchInput): Promise<SearchPlan> {
        const prompt = [
            'Bạn là bộ phân tích tìm kiếm địa điểm tại Huế.',
            'Chỉ dùng code có trong catalog. "phải có/bắt buộc/cần có" là required; mong muốn còn lại là preferred.',
            'openCondition: dùng {mode:"now"} cho đang mở/bây giờ; dùng {mode:"at",dayOfWeek:1..7,time:"HH:mm"} khi có đủ thứ và giờ (1=thứ Hai, 7=Chủ nhật); nếu không yêu cầu giờ thì null.',
            'Không tự bịa code. Không chắc thì dùng null hoặc mảng rỗng. keywords chỉ giữ từ khóa tên/ý nghĩa chưa map được.',
            `Catalog: ${JSON.stringify({ categories: input.categories, tags: input.tags, wards: input.wards })}`,
            `Yêu cầu: ${input.query}`,
        ].join('\n');

        let timeoutId: NodeJS.Timeout | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Gemini request timed out.')), aiSearchConfig.timeoutMs);
        });
        const response = await Promise.race([
            this.client.models.generateContent({
                model: aiSearchConfig.geminiModel,
                contents: prompt,
                config: { responseMimeType: 'application/json', responseJsonSchema, temperature: 0 },
            }),
            timeout,
        ]).finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
        });
        if (!response.text) throw new Error('Gemini returned an empty response.');
        return searchPlanSchema.parse(JSON.parse(response.text));
    }
}
