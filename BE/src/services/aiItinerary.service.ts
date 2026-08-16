import Location from '../models/location.model.ts';
import Itinerary from '../models/itinerary.model.ts';
import { parseAndValidateAIItineraryRequest } from './aiItineraryValidation.service.ts';
import { OriginResolverService } from './aiItineraryOriginResolver.service.ts';
import { PreferenceParserService } from './aiItineraryPreferenceParser.service.ts';
import { CandidateRetrievalService } from './aiItineraryCandidateRetrieval.service.ts';
import { CandidateRankingService } from './aiItineraryCandidateRanking.service.ts';
import { AIItineraryPlannerService } from './aiItineraryPlanner.service.ts';
import { AIItineraryPlanValidatorService } from './aiItineraryPlanValidator.service.ts';
import { TimelineService } from './aiItineraryTimeline.service.ts';
import { AIItineraryDraftService } from './aiItineraryDraft.service.ts';
import { AIItineraryAlternativesService } from './aiItineraryAlternatives.service.ts';
import { ApiError } from '../utils/apiError.ts';
import mongoose from 'mongoose';
import type { CreateAIItineraryPlanRequest } from '../schemas/aiItinerary.schema.ts';

export class AIItineraryService {
    static async generatePlan(actorId: string, rawInput: unknown) {
        const validatedInput: CreateAIItineraryPlanRequest = parseAndValidateAIItineraryRequest(rawInput);
        const resolvedOrigin = await OriginResolverService.resolve(validatedInput.origin);
        const normalizedPreferences = PreferenceParserService.normalize(validatedInput.preferences);

        const candidates = await CandidateRetrievalService.retrieveCandidates({
            preferences: normalizedPreferences,
            mustVisitLocationIds: validatedInput.mustVisitLocationIds,
        });

        if (candidates.length === 0) {
            throw new ApiError(400, 'INSUFFICIENT_CANDIDATES', 'Không tìm thấy địa điểm phù hợp với bộ lọc.');
        }

        const rankedCandidates = CandidateRankingService.rank({
            candidates,
            preferences: normalizedPreferences,
            mustVisitLocationIds: validatedInput.mustVisitLocationIds,
            originCoordinates: resolvedOrigin.coordinates,
        });

        const mustVisitLocations = candidates
            .filter((c) => validatedInput.mustVisitLocationIds.includes(c._id.toString()))
            .map((c) => ({ id: c._id.toString(), name: c.name }));

        const candidateSummaries = rankedCandidates.map((r) => ({
            id: r.location._id.toString(),
            name: r.location.name,
            categoryCode: r.location.categoryCode,
            tagCodes: r.location.tagCodes,
            rating: r.location.ratingSummary?.average || 0,
            coordinates: r.location.geo.coordinates as [number, number],
        }));

        const plannerService = new AIItineraryPlannerService();
        const rawAIPlan = await plannerService.createPlan({
            trip: {
                durationDays: validatedInput.durationDays,
                dailyTimeRange: validatedInput.dailyTimeRange,
                transport: validatedInput.transport,
                pace: validatedInput.pace,
            },
            normalizedPreferences,
            mustVisitLocations,
            candidates: candidateSummaries,
        });

        const validatedAIPlan = await AIItineraryPlanValidatorService.validateAndRepairPlan(
            rawAIPlan,
            validatedInput.durationDays,
            candidates,
            validatedInput.mustVisitLocationIds,
        );

        const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]));
        const calculatedDays = [];
        const allWarnings: string[] = [...(validatedAIPlan.warnings || [])];

        for (const day of validatedAIPlan.days) {
            const timelineInputs = [];
            for (const item of day.items) {
                const loc = candidateMap.get(item.locationId);
                if (loc) {
                    timelineInputs.push({
                        location: loc,
                        suggestedStartTime: item.suggestedStartTime,
                        durationMinutes: item.durationMinutes,
                        note: item.note || '',
                    });
                }
            }

            const dayResult = TimelineService.calculateDayTimeline(
                day.dayNumber,
                timelineInputs,
                resolvedOrigin.coordinates,
                validatedInput.dailyTimeRange,
                validatedInput.transport,
            );

            allWarnings.push(...dayResult.warnings);

            calculatedDays.push({
                dayNumber: day.dayNumber,
                items: dayResult.items.map((item) => ({
                    locationId: new mongoose.Types.ObjectId(item.locationId),
                    suggestedStartTime: item.suggestedStartTime,
                    durationMinutes: item.durationMinutes,
                    estimatedTravelMinutes: item.estimatedTravelMinutes,
                    note: item.note,
                })),
            });
        }

        const draft = await AIItineraryDraftService.createDraft({
            ownerId: new mongoose.Types.ObjectId(actorId),
            title: validatedAIPlan.title,
            durationDays: validatedInput.durationDays,
            startDate: validatedInput.startDate ? new Date(validatedInput.startDate) : null,
            dailyTimeRange: validatedInput.dailyTimeRange,
            origin: {
                type: validatedInput.origin.type,
                coordinates: resolvedOrigin.coordinates,
                ...(resolvedOrigin.locationId ? { locationId: new mongoose.Types.ObjectId(resolvedOrigin.locationId) } : {}),
            },
            transport: validatedInput.transport,
            pace: validatedInput.pace,
            preferences: validatedInput.preferences,
            normalizedPreferences,
            mustVisitLocationIds: validatedInput.mustVisitLocationIds.map((id) => new mongoose.Types.ObjectId(id)),
            preferenceText: validatedInput.preferenceText,
            days: calculatedDays,
            warnings: Array.from(new Set(allWarnings)),
        });

        return draft;
    }

    static async getDraftPreview(actorId: string, planId: string) {
        const draft = await AIItineraryDraftService.getOwnedActiveDraft(planId, actorId);
        if (!draft) {
            throw new ApiError(404, 'DRAFT_EXPIRED_OR_NOT_FOUND', 'Bản nháp kế hoạch không tồn tại hoặc đã hết hạn.');
        }
        return draft;
    }

    static async getItemAlternatives(actorId: string, planId: string, locationId: string) {
        const draft = await this.getDraftPreview(actorId, planId);
        const targetLoc = await Location.findOne({ _id: locationId, status: 'approved' });
        if (!targetLoc) {
            throw new ApiError(404, 'LOCATION_NOT_FOUND', 'Địa điểm không tồn tại.');
        }

        const draftLocationIds = draft.days.flatMap((d) => d.items.map((i) => i.locationId.toString()));
        return await AIItineraryAlternativesService.findAlternatives(targetLoc, draftLocationIds, 5);
    }

    static async replaceDraftItem(actorId: string, planId: string, oldLocationId: string, newLocationId: string) {
        const draft = await this.getDraftPreview(actorId, planId);
        const newLoc = await Location.findOne({ _id: newLocationId, status: 'approved' });
        if (!newLoc) {
            throw new ApiError(404, 'LOCATION_NOT_FOUND', 'Địa điểm mới không hợp lệ hoặc chưa được duyệt.');
        }

        let replaced = false;
        for (const day of draft.days) {
            for (const item of day.items) {
                if (item.locationId.toString() === oldLocationId) {
                    item.locationId = new mongoose.Types.ObjectId(newLocationId);
                    replaced = true;
                    break;
                }
            }
            if (replaced) break;
        }

        if (!replaced) {
            throw new ApiError(404, 'ITEM_NOT_FOUND', 'Địa điểm cần thay thế không có trong bản nháp.');
        }

        const updated = await AIItineraryDraftService.updateOwnedDraft(planId, actorId, { days: draft.days });
        return updated;
    }

    static async deleteDraftItem(actorId: string, planId: string, locationId: string) {
        const draft = await this.getDraftPreview(actorId, planId);

        for (const day of draft.days) {
            day.items = day.items.filter((item) => item.locationId.toString() !== locationId) as typeof day.items;
        }

        const updated = await AIItineraryDraftService.updateOwnedDraft(planId, actorId, { days: draft.days });
        return updated;
    }

    static async savePlanToItinerary(actorId: string, planId: string) {
        const draft = await this.getDraftPreview(actorId, planId);

        const allLocationIds = draft.days.flatMap((d) => d.items.map((i) => i.locationId.toString()));
        const uniqueObjectIds = [...new Set(allLocationIds)].map((id) => new mongoose.Types.ObjectId(id));

        const approvedLocations = await Location.find({
            _id: { $in: uniqueObjectIds },
            status: 'approved',
        });

        const approvedSet = new Set(approvedLocations.map((loc) => loc._id.toString()));
        const invalidItems = uniqueObjectIds.filter((id) => !approvedSet.has(id.toString())).map((id) => id.toString());

        if (invalidItems.length > 0) {
            throw new ApiError(409, 'PLAN_HAS_UNAVAILABLE_LOCATIONS', 'Kế hoạch có địa điểm đã bị ngưng hoạt động hoặc ẩn.', {
                invalidItems,
            });
        }

        const officialItineraryDays = draft.days.map((day) => ({
            dayNumber: day.dayNumber,
            items: day.items.map((item, index) => ({
                locationId: item.locationId,
                order: index + 1,
                startTime: item.suggestedStartTime,
                endTime: null,
                durationMinutes: item.durationMinutes,
                note: item.note || '',
            })),
        }));

        const itinerary = await Itinerary.create({
            ownerId: new mongoose.Types.ObjectId(actorId),
            title: draft.title,
            description: draft.preferenceText || 'Tạo từ AI Itinerary Planner',
            startDate: draft.startDate,
            visibility: 'private',
            status: 'active',
            days: officialItineraryDays,
        });

        await AIItineraryDraftService.deleteOwnedDraft(planId, actorId);

        return itinerary;
    }
}
