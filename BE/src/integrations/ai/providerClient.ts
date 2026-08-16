import { GoogleGenAI } from '@google/genai';
import { aiSearchConfig } from '../../config/aiSearch.config.ts';
import type {
    AIPlannerClient,
    AIPlannerCreatePlanInput,
    AIPlannerRepairPlanInput,
    AIPlannerOutput,
} from './aiClient.interface.ts';

const responseJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'days'],
    properties: {
        title: { type: 'string' },
        days: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['dayNumber', 'items'],
                properties: {
                    dayNumber: { type: 'integer' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['locationId', 'suggestedStartTime', 'durationMinutes'],
                            properties: {
                                locationId: { type: 'string' },
                                suggestedStartTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
                                durationMinutes: { type: 'integer', minimum: 1 },
                                note: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        warnings: { type: 'array', items: { type: 'string' } },
    },
};

export class MockPlannerClient implements AIPlannerClient {
    async createPlan(input: AIPlannerCreatePlanInput): Promise<AIPlannerOutput> {
        const { durationDays, dailyTimeRange } = input.trip;
        const candidates = input.candidates;

        const days = [];
        const numCandidates = candidates.length;

        for (let d = 1; d <= durationDays; d++) {
            const items = [];
            const itemsForThisDay = Math.min(3, Math.ceil(numCandidates / durationDays));

            for (let i = 0; i < itemsForThisDay; i++) {
                const candidateIndex = ((d - 1) * itemsForThisDay + i) % Math.max(1, numCandidates);
                const candidate = candidates[candidateIndex];
                if (!candidate) continue;

                const startHour = 8 + i * 3;
                const timeStr = `${String(startHour).padStart(2, '0')}:00`;

                items.push({
                    locationId: candidate.id,
                    suggestedStartTime: timeStr,
                    durationMinutes: 90,
                    note: `Tham quan ${candidate.name}`,
                });
            }

            days.push({ dayNumber: d, items });
        }

        return {
            title: `Hành trình du lịch Huế ${durationDays} ngày`,
            days,
            warnings: [],
        };
    }

    async repairPlan(input: AIPlannerRepairPlanInput): Promise<AIPlannerOutput> {
        return input.originalPlan;
    }
}

export class GeminiPlannerClient implements AIPlannerClient {
    private readonly client: GoogleGenAI;

    constructor() {
        if (!aiSearchConfig.geminiApiKey) {
            throw new Error('GEMINI_API_KEY is required for AI_PROVIDER=gemini.');
        }
        this.client = new GoogleGenAI({ apiKey: aiSearchConfig.geminiApiKey });
    }

    async createPlan(input: AIPlannerCreatePlanInput): Promise<AIPlannerOutput> {
        const prompt = [
            'Bạn là chuyên gia lập kế hoạch du lịch tại Huế.',
            'Tạo lịch trình du lịch tối ưu dựa trên danh sách địa điểm ứng viên được cung cấp.',
            'QUY TẮC BẮT BUỘC:',
            '1. CHỈ sử dụng locationId trong danh sách ứng viên (candidates). Không được tự tạo ID mới.',
            '2. BẮT BUỘC phải sắp xếp toàn bộ các địa điểm trong mustVisitLocations vào lịch trình.',
            '3. Không được trùng lặp locationId trong toàn bộ hành trình.',
            '4. suggestedStartTime có định dạng HH:mm, nằm trong khoảng dailyTimeRange.',
            `Thông tin chuyến đi: ${JSON.stringify(input.trip)}`,
            `Địa điểm bắt buộc (Must Visit): ${JSON.stringify(input.mustVisitLocations)}`,
            `Sở thích: ${JSON.stringify(input.normalizedPreferences)}`,
            `Danh sách ứng viên (Candidates): ${JSON.stringify(input.candidates)}`,
        ].join('\n');

        let timeoutId: NodeJS.Timeout | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Gemini itinerary request timed out.')), aiSearchConfig.timeoutMs);
        });

        const response = await Promise.race([
            this.client.models.generateContent({
                model: aiSearchConfig.geminiModel,
                contents: prompt,
                config: { responseMimeType: 'application/json', responseJsonSchema, temperature: 0.2 },
            }),
            timeout,
        ]).finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
        });

        if (!response.text) throw new Error('Gemini returned an empty response for itinerary plan.');
        return JSON.parse(response.text) as AIPlannerOutput;
    }

    async repairPlan(input: AIPlannerRepairPlanInput): Promise<AIPlannerOutput> {
        const prompt = [
            'Lịch trình trước đó bạn tạo đã vi phạm các quy tắc sau:',
            ...input.validationErrors.map((err) => `- ${err}`),
            'Hãy sửa lại kế hoạch và chỉ dùng locationId từ danh sách ứng viên hợp lệ.',
            `Kế hoạch lỗi ban đầu: ${JSON.stringify(input.originalPlan)}`,
            `Danh sách ứng viên hợp lệ: ${JSON.stringify(input.candidates)}`,
        ].join('\n');

        let timeoutId: NodeJS.Timeout | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Gemini repair request timed out.')), aiSearchConfig.timeoutMs);
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

        if (!response.text) throw new Error('Gemini returned empty repair response.');
        return JSON.parse(response.text) as AIPlannerOutput;
    }
}
