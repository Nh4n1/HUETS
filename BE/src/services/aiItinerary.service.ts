import mongoose from 'mongoose';
import AiItineraryDraft from '../models/aiItineraryDraft.model.ts';
import Location from '../models/location.model.ts';
import { resolveRecommendedVisitMinutes } from '../reference/itineraryPlanningDefaults.ts';
import {
    aiItineraryRequestSchema,
    aiPlanSchema,
    saveAiPlanSchema,
    updateAiDraftSchema,
    type AiItineraryRequest,
    type AiPlan,
} from '../schemas/aiItinerary.schema.ts';
import { ApiError } from '../utils/apiError.ts';
import { checkPlanningFeasibility } from './aiItineraryFeasibility.service.ts';
import { validateAiPlan } from './aiItineraryPlanValidator.service.ts';
import { generateAiItineraryPlan, type PlannerCandidate } from './aiItineraryPlanner.service.ts';
import { createItinerary } from './itinerary.service.ts';

interface Actor {
    id: string;
    role: 'user' | 'mod' | 'admin';
}

interface LocationRecord {
    _id: mongoose.Types.ObjectId;
    name: string;
    categoryCode: string;
    tagCodes: string[];
    geo?: { coordinates?: [number, number] };
    openingHours: PlannerCandidate['openingHours'];
    ratingSummary?: { average?: number };
    status: string;
    isDeleted?: boolean;
    address?: { addressLine?: string; wardNameSnapshot?: string };
    images?: Array<{ url: string; position: number }>;
}

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const CANDIDATE_CAP = 30;
const logEvent = (event: string, details: Record<string, unknown>) => {
    console.info(JSON.stringify({ event, ...details }));
};

const assertActor = (actor: Actor) => {
    if (!mongoose.isValidObjectId(actor.id)) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
};

const openingAvailability = (
    location: LocationRecord,
    request: AiItineraryRequest,
): PlannerCandidate['openingAvailability'] => Array.from({ length: request.durationDays }, (_, index) => {
    const dayNumber = index + 1;
    if (location.openingHours.status === 'always_open') return { dayNumber, status: 'open' as const };
    if (location.openingHours.status === 'unknown' || !request.startDate) {
        return { dayNumber, status: 'unknown' as const };
    }
    const date = new Date(`${request.startDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const period = location.openingHours.periods.find((entry) => entry.dayOfWeek === dayOfWeek);
    return { dayNumber, status: period?.ranges.length ? 'open' as const : 'closed' as const };
});

const toCandidate = (location: LocationRecord, request: AiItineraryRequest): PlannerCandidate => {
    const coordinates = location.geo?.coordinates;
    return {
        id: location._id.toString(),
        name: location.name,
        categoryCode: location.categoryCode,
        tagCodes: location.tagCodes ?? [],
        averageRating: location.ratingSummary?.average ?? 0,
        recommendedVisitMinutes: resolveRecommendedVisitMinutes(location.categoryCode),
        openingAvailability: openingAvailability(location, request),
        openingHours: location.openingHours,
        ...(coordinates ? { geo: { lng: coordinates[0], lat: coordinates[1] } } : {}),
    };
};

const locationSelection = {
    _id: 1, name: 1, categoryCode: 1, tagCodes: 1, geo: 1, openingHours: 1,
    ratingSummary: 1, status: 1, isDeleted: 1, address: 1, images: 1,
};

const retrieveCandidates = async (request: AiItineraryRequest) => {
    const mustRecords = await Location.find({
        _id: { $in: request.mustVisitLocationIds },
        status: 'approved',
        isDeleted: { $ne: true },
    }).select(locationSelection).lean() as unknown as LocationRecord[];
    const mustCandidates = mustRecords.map((location) => toCandidate(location, request));
    const feasibilityIssues = checkPlanningFeasibility(request, mustCandidates);
    if (feasibilityIssues.length > 0) {
        throw new ApiError(422, 'PLANNING_CONFLICT', 'Không thể tạo lịch trình với yêu cầu hiện tại.', {
            issues: feasibilityIssues,
        });
    }

    const normalLimit = Math.max(0, CANDIDATE_CAP - mustCandidates.length);
    let normalRecords: LocationRecord[] = [];
    if (normalLimit > 0) {
        const records = await Location.find({
            status: 'approved',
            isDeleted: { $ne: true },
            categoryCode: { $in: request.preferences.preferredCategoryCodes },
            _id: { $nin: request.mustVisitLocationIds },
        }).select(locationSelection).sort({ 'ratingSummary.average': -1, 'ratingSummary.count': -1 }).limit(normalLimit).lean();
        normalRecords = records as unknown as LocationRecord[];
    }
    const preferredTags = new Set(request.preferences.preferredTagCodes ?? []);
    const normalCandidates = normalRecords.map((location) => toCandidate(location, request)).sort((left, right) => {
        const leftTags = left.tagCodes.filter((tag) => preferredTags.has(tag)).length;
        const rightTags = right.tagCodes.filter((tag) => preferredTags.has(tag)).length;
        return rightTags - leftTags || right.averageRating - left.averageRating;
    });
    const candidates = [...mustCandidates, ...normalCandidates];
    if (candidates.length === 0) {
        throw new ApiError(422, 'PLANNING_CONFLICT', 'Không tìm thấy địa điểm phù hợp để tạo lịch trình.', {
            issues: [{ level: 'error', code: 'LOCATION_UNAVAILABLE', message: 'Không có candidate công khai phù hợp.' }],
        });
    }
    return candidates;
};

const mapForValidation = (candidates: PlannerCandidate[]) => new Map(candidates.map((candidate) => [
    candidate.id,
    {
        _id: candidate.id,
        name: candidate.name,
        status: 'approved',
        isDeleted: false,
        openingHours: candidate.openingHours,
    },
]));

const generateValidatedPlan = async (request: AiItineraryRequest, candidates: PlannerCandidate[]) => {
    const candidateIds = new Set(candidates.map(({ id }) => id));
    const locationsById = mapForValidation(candidates);
    let plan: AiPlan;
    try {
        plan = await generateAiItineraryPlan(request, candidates);
    } catch {
        throw new ApiError(422, 'PLANNING_CONFLICT', 'Không thể xếp đầy đủ Must Visit vào khung giờ đã chọn.', {
            issues: [{
                level: 'error', code: 'MUST_VISIT_TIME_CONFLICT',
                message: 'Hãy thêm ngày, đổi khung giờ hoặc chỉnh danh sách Must Visit.',
            }],
        });
    }
    let validation = validateAiPlan({ plan, request, candidateLocationIds: candidateIds, locationsById });
    const errors = validation.issues.filter(({ level }) => level === 'error');
    if (errors.length > 0) {
        try {
            plan = await generateAiItineraryPlan(request, candidates, errors.map(({ message }) => message));
        } catch {
            throw new ApiError(422, 'INVALID_AI_PLAN', 'AI chưa sửa được lịch trình không hợp lệ.', {
                issues: validation.issues,
            });
        }
        validation = validateAiPlan({ plan, request, candidateLocationIds: candidateIds, locationsById });
    }
    const finalErrors = validation.issues.filter(({ level }) => level === 'error');
    if (finalErrors.length > 0) {
        throw new ApiError(422, 'INVALID_AI_PLAN', 'AI chưa tạo được lịch trình hợp lệ.', {
            issues: validation.issues,
        });
    }
    return {
        ...plan,
        warnings: [...new Set([
            ...plan.warnings,
            ...validation.issues.filter(({ level }) => level === 'warning').map(({ message }) => message),
        ])],
    };
};

const findOwnedDraft = async (planId: string, actor: Actor) => {
    assertActor(actor);
    if (!mongoose.isValidObjectId(planId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy AI draft.');
    const draft = await AiItineraryDraft.findOne({ _id: planId, userId: actor.id });
    if (!draft || draft.expiresAt.getTime() <= Date.now()) {
        throw new ApiError(404, 'NOT_FOUND', 'AI draft không tồn tại hoặc đã hết hạn.');
    }
    return draft;
};

const draftPlan = (document: Awaited<ReturnType<typeof findOwnedDraft>>): AiPlan => aiPlanSchema.parse({
    title: document.draft.title,
    warnings: [...document.draft.warnings],
    days: document.draft.days.map((day) => ({
        dayNumber: day.dayNumber,
        items: day.items.map((item) => ({
            locationId: item.locationId.toString(),
            suggestedStartTime: item.suggestedStartTime,
            durationMinutes: item.durationMinutes,
            note: item.note,
        })),
    })),
});

const requestFromDocument = (document: Awaited<ReturnType<typeof findOwnedDraft>>): AiItineraryRequest => ({
    durationDays: document.request.durationDays,
    startDate: document.request.startDate,
    dailyTimeRange: { ...document.request.dailyTimeRange },
    pace: document.request.pace,
    preferences: {
        preferredCategoryCodes: [...document.request.preferences.preferredCategoryCodes],
        preferredTagCodes: [...document.request.preferences.preferredTagCodes],
    },
    mustVisitLocationIds: document.request.mustVisitLocationIds.map((id) => id.toString()),
});

const toDraftResponse = async (document: Awaited<ReturnType<typeof findOwnedDraft>>) => {
    const plan = draftPlan(document);
    const ids = [...new Set(plan.days.flatMap((day) => day.items.map(({ locationId }) => locationId)))];
    const locations = (await Location.find({ _id: { $in: ids } }).select(locationSelection).lean()) as unknown as LocationRecord[];
    const locationMap = new Map(locations.map((location) => [location._id.toString(), location]));
    return {
        id: document._id.toString(),
        request: requestFromDocument(document),
        title: plan.title,
        warnings: plan.warnings,
        expiresAt: document.expiresAt,
        days: document.draft.days.map((day) => ({
            dayNumber: day.dayNumber,
            items: day.items.map((item) => {
                const location = locationMap.get(item.locationId.toString());
                const available = location?.status === 'approved' && location.isDeleted !== true;
                return {
                    id: item._id.toString(),
                    locationId: item.locationId.toString(),
                    startTime: item.suggestedStartTime,
                    endTime: null,
                    durationMinutes: item.durationMinutes,
                    note: item.note,
                    availability: available ? 'available' : 'unavailable',
                    location: location ? {
                        id: location._id.toString(),
                        name: location.name,
                        category: { code: location.categoryCode, name: location.categoryCode },
                        formattedAddress: [location.address?.addressLine, location.address?.wardNameSnapshot].filter(Boolean).join(', '),
                        coverImageUrl: [...(location.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
                        openingHours: location.openingHours,
                        status: location.status,
                    } : null,
                };
            }),
        })),
    };
};

export const createAiItineraryPlan = async (input: unknown, actor: Actor) => {
    assertActor(actor);
    const request = aiItineraryRequestSchema.parse(input);
    logEvent('ai_itinerary.generate.started', {
        userId: actor.id, durationDays: request.durationDays, pace: request.pace,
    });
    let candidates: PlannerCandidate[];
    let plan: AiPlan;
    try {
        candidates = await retrieveCandidates(request);
        plan = await generateValidatedPlan(request, candidates);
    } catch (error) {
        const errorCode = error instanceof ApiError ? error.code : 'UNKNOWN';
        logEvent(
            errorCode === 'PLANNING_CONFLICT'
                ? 'ai_itinerary.precheck.conflict'
                : errorCode === 'INVALID_AI_PLAN'
                    ? 'ai_itinerary.generate.invalid'
                    : 'ai_itinerary.generate.failed',
            { userId: actor.id, durationDays: request.durationDays, pace: request.pace, errorCode },
        );
        throw error;
    }
    const document = await AiItineraryDraft.create({
        userId: actor.id,
        request: {
            ...request,
            startDate: request.startDate ?? null,
            preferences: {
                preferredCategoryCodes: request.preferences.preferredCategoryCodes,
                preferredTagCodes: request.preferences.preferredTagCodes ?? [],
            },
        },
        candidateLocationIds: candidates.map(({ id }) => id),
        draft: plan,
        expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
    });
    logEvent('ai_itinerary.generate.success', {
        userId: actor.id, planId: document._id.toString(), candidateCount: candidates.length,
        durationDays: request.durationDays, pace: request.pace,
    });
    return toDraftResponse(document);
};

export const getAiItineraryPlan = async (planId: string, actor: Actor) =>
    toDraftResponse(await findOwnedDraft(planId, actor));

export const updateAiItineraryPlan = async (planId: string, input: unknown, actor: Actor) => {
    const document = await findOwnedDraft(planId, actor);
    const update = updateAiDraftSchema.parse(input);
    const plan: AiPlan = { ...update, warnings: [...document.draft.warnings] };
    const request = requestFromDocument(document);
    const candidateIds = [...new Set([
        ...document.candidateLocationIds.map((id) => id.toString()),
        ...plan.days.flatMap((day) => day.items.map(({ locationId }) => locationId)),
    ])];
    const locations = (await Location.find({ _id: { $in: candidateIds } }).select(locationSelection).lean()) as unknown as LocationRecord[];
    const locationsById = new Map(locations.map((location) => [location._id.toString(), location]));
    const validation = validateAiPlan({
        plan,
        request,
        candidateLocationIds: new Set(candidateIds),
        locationsById,
    });
    const errors = validation.issues.filter(({ level }) => level === 'error');
    if (errors.length > 0) {
        throw new ApiError(422, 'PLANNING_CONFLICT', 'AI draft còn xung đột cần xử lý.', { issues: validation.issues });
    }
    document.set('draft', {
        ...plan,
        warnings: [...new Set([
            ...plan.warnings,
            ...validation.issues.filter(({ level }) => level === 'warning').map(({ message }) => message),
        ])],
    });
    document.set('candidateLocationIds', candidateIds);
    await document.save();
    return toDraftResponse(document);
};

export const saveAiItineraryPlan = async (input: unknown, actor: Actor) => {
    const parsed = saveAiPlanSchema.parse(input);
    const document = await findOwnedDraft(parsed.planId, actor);
    const plan = draftPlan(document);
    const request = requestFromDocument(document);
    const candidateIds = document.candidateLocationIds.map((id) => id.toString());
    const locations = (await Location.find({ _id: { $in: candidateIds } }).select(locationSelection).lean()) as unknown as LocationRecord[];
    const validation = validateAiPlan({
        plan,
        request,
        candidateLocationIds: new Set(candidateIds),
        locationsById: new Map(locations.map((location) => [location._id.toString(), location])),
    });
    if (validation.issues.some(({ level }) => level === 'error')) {
        logEvent('ai_itinerary.save.conflict', {
            userId: actor.id,
            planId: document._id.toString(),
            errorCode: 'PLAN_HAS_UNAVAILABLE_LOCATIONS',
        });
        throw new ApiError(409, 'PLAN_HAS_UNAVAILABLE_LOCATIONS', 'AI draft đã thay đổi và không còn hợp lệ.', {
            issues: validation.issues,
        });
    }
    const itinerary = await createItinerary({
        title: parsed.title ?? plan.title,
        description: parsed.description ?? '',
        startDate: request.startDate,
        visibility: parsed.visibility ?? 'private',
        days: plan.days.map((day) => ({
            dayNumber: day.dayNumber,
            items: day.items.map((item, index) => ({
                locationId: item.locationId,
                order: index + 1,
                startTime: item.suggestedStartTime,
                durationMinutes: item.durationMinutes,
                note: item.note ?? null,
            })),
        })),
    }, actor);
    await AiItineraryDraft.deleteOne({ _id: document._id });
    return itinerary;
};
