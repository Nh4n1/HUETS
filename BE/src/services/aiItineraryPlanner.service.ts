import { GoogleGenAI } from '@google/genai';
import { aiSearchConfig } from '../config/aiSearch.config.ts';
import { aiPlanSchema, type AiItineraryRequest, type AiPlan } from '../schemas/aiItinerary.schema.ts';

export interface PlannerCandidate {
    id: string;
    name: string;
    categoryCode: string;
    tagCodes: string[];
    averageRating: number;
    recommendedVisitMinutes: number;
    openingAvailability: Array<{ dayNumber: number; status: 'open' | 'closed' | 'unknown' }>;
    openingHours: {
        status: 'unknown' | 'always_open' | 'scheduled';
        periods: Array<{ dayOfWeek: number; ranges: Array<{ open: string; close: string }> }>;
    };
    geo?: { lat: number; lng: number };
}

const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const toTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

const earliestStart = (
    candidate: PlannerCandidate,
    dayNumber: number,
    cursor: number,
    duration: number,
    request: AiItineraryRequest,
) => {
    const dayEnd = toMinutes(request.dailyTimeRange.end);
    const availability = candidate.openingAvailability.find((entry) => entry.dayNumber === dayNumber)?.status;
    if (availability === 'closed') return null;
    if (candidate.openingHours.status !== 'scheduled' || !request.startDate) {
        return cursor + duration <= dayEnd ? cursor : null;
    }
    const date = new Date(`${request.startDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + dayNumber - 1);
    const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const ranges = candidate.openingHours.periods.find((period) => period.dayOfWeek === dayOfWeek)?.ranges ?? [];
    for (const range of ranges) {
        const start = Math.max(cursor, toMinutes(range.open));
        if (start + duration <= Math.min(dayEnd, toMinutes(range.close))) return start;
    }
    return null;
};

const mockPlan = (
    request: AiItineraryRequest,
    candidates: PlannerCandidate[],
): AiPlan => {
    const mustVisit = new Set(request.mustVisitLocationIds);
    const ordered = [
        ...candidates.filter(({ id }) => mustVisit.has(id)),
        ...candidates.filter(({ id }) => !mustVisit.has(id)),
    ];
    const gap = request.pace === 'relaxed' ? 30 : request.pace === 'balanced' ? 15 : 0;
    const days = Array.from({ length: request.durationDays }, (_, index) => ({ dayNumber: index + 1, items: [] as AiPlan['days'][number]['items'] }));
    const cursors = days.map(() => toMinutes(request.dailyTimeRange.start));

    for (const candidate of ordered) {
        let placed = false;
        for (let index = 0; index < days.length; index += 1) {
            const day = days[index];
            const cursor = cursors[index];
            if (!day || cursor === undefined) continue;
            const start = earliestStart(candidate, day.dayNumber, cursor, candidate.recommendedVisitMinutes, request);
            if (start === null) continue;
            day.items.push({
                locationId: candidate.id,
                suggestedStartTime: toTime(start),
                durationMinutes: candidate.recommendedVisitMinutes,
                note: null,
            });
            cursors[index] = start + candidate.recommendedVisitMinutes + gap;
            placed = true;
            break;
        }
        if (!placed && mustVisit.has(candidate.id)) {
            throw new Error(`Must Visit ${candidate.id} cannot be scheduled.`);
        }
    }
    return aiPlanSchema.parse({
        title: `${request.durationDays} ngày khám phá Huế`,
        days,
        warnings: request.pace === 'relaxed' && request.mustVisitLocationIds.length > request.durationDays * 3
            ? ['Lịch trình có thể dày hơn nhịp độ Thư giãn do các địa điểm Must Visit.']
            : [],
    });
};

const responseJsonSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'days', 'warnings'],
    properties: {
        title: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
        days: { type: 'array', items: {
            type: 'object', additionalProperties: false, required: ['dayNumber', 'items'], properties: {
                dayNumber: { type: 'integer' },
                items: { type: 'array', items: {
                    type: 'object', additionalProperties: false,
                    required: ['locationId', 'suggestedStartTime', 'durationMinutes', 'note'],
                    properties: {
                        locationId: { type: 'string' },
                        suggestedStartTime: { type: 'string' },
                        durationMinutes: { type: 'integer' },
                        note: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    },
                } },
            },
        } },
    },
};

const geminiPlan = async (
    request: AiItineraryRequest,
    candidates: PlannerCandidate[],
    repairIssues?: string[],
) => {
    if (!aiSearchConfig.geminiApiKey) throw new Error('GEMINI_API_KEY is required for AI_PROVIDER=gemini.');
    const client = new GoogleGenAI({ apiKey: aiSearchConfig.geminiApiKey });
    const prompt = [
        'Bạn là planner du lịch Huế. Chỉ trả JSON đúng schema.',
        'Chỉ dùng locationId trong candidates. Mọi mustVisitLocationIds phải xuất hiện đúng một lần.',
        'Pace là sở thích mềm; Must Visit, khung giờ mỗi ngày và openingAvailability là ràng buộc cứng.',
        'Không tạo travel time. Dùng recommendedVisitMinutes. Không xếp chồng thời gian.',
        `Input: ${JSON.stringify({ trip: request, candidates })}`,
        ...(repairIssues?.length ? [`Kết quả trước không hợp lệ. Hãy sửa các lỗi: ${repairIssues.join('; ')}`] : []),
    ].join('\n');
    let timeoutId: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Gemini itinerary request timed out.')), aiSearchConfig.timeoutMs);
    });
    const response = await Promise.race([
        client.models.generateContent({
            model: aiSearchConfig.geminiModel,
            contents: prompt,
            config: { responseMimeType: 'application/json', responseJsonSchema, temperature: 0.2 },
        }),
        timeout,
    ]).finally(() => { if (timeoutId) clearTimeout(timeoutId); });
    if (!response.text) throw new Error('Gemini returned an empty itinerary response.');
    return aiPlanSchema.parse(JSON.parse(response.text));
};

export const generateAiItineraryPlan = async (
    request: AiItineraryRequest,
    candidates: PlannerCandidate[],
    repairIssues?: string[],
) => {
    if (aiSearchConfig.provider !== 'gemini') return mockPlan(request, candidates);
    try {
        return await geminiPlan(request, candidates, repairIssues);
    } catch (error) {
        if (!aiSearchConfig.fallbackToMock) throw error;
        return mockPlan(request, candidates);
    }
};
