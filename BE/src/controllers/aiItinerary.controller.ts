import type { Request, Response } from 'express';
import { AIItineraryService } from '../services/aiItinerary.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const getCurrentUserId = (req: Request): string => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    return req.user.id;
};

export const generatePlanController = asyncHandler(async (req: Request, res: Response) => {
    const actorId = getCurrentUserId(req);
    const draft = await AIItineraryService.generatePlan(actorId, req.body);
    return sendSuccess(res, 201, draft);
});

export const getDraftPreviewController = asyncHandler(async (req: Request, res: Response) => {
    const actorId = getCurrentUserId(req);
    const planId = req.params.planId;
    if (!planId || typeof planId !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu planId.');

    const draft = await AIItineraryService.getDraftPreview(actorId, planId);
    return sendSuccess(res, 200, draft);
});

export const getItemAlternativesController = asyncHandler(async (req: Request, res: Response) => {
    const actorId = getCurrentUserId(req);
    const planId = req.params.planId;
    const locationId = req.params.locationId;
    if (!planId || typeof planId !== 'string' || !locationId || typeof locationId !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu planId hoặc locationId.');
    }

    const alternatives = await AIItineraryService.getItemAlternatives(actorId, planId, locationId);
    return sendSuccess(res, 200, alternatives);
});

export const replaceDraftItemController = asyncHandler(async (req: Request, res: Response) => {
    const actorId = getCurrentUserId(req);
    const planId = req.params.planId;
    const oldLocationId = req.params.locationId;
    const newLocationId = req.body?.newLocationId;
    if (!planId || typeof planId !== 'string' || !oldLocationId || typeof oldLocationId !== 'string' || !newLocationId || typeof newLocationId !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu thông tin thay thế địa điểm.');
    }

    const updatedDraft = await AIItineraryService.replaceDraftItem(actorId, planId, oldLocationId, newLocationId);
    return sendSuccess(res, 200, updatedDraft);
});

export const deleteDraftItemController = asyncHandler(async (req: Request, res: Response) => {
    const actorId = getCurrentUserId(req);
    const planId = req.params.planId;
    const locationId = req.params.locationId;
    if (!planId || typeof planId !== 'string' || !locationId || typeof locationId !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu planId hoặc locationId.');
    }

    const updatedDraft = await AIItineraryService.deleteDraftItem(actorId, planId, locationId);
    return sendSuccess(res, 200, updatedDraft);
});

export const savePlanToItineraryController = asyncHandler(async (req: Request, res: Response) => {
    const actorId = getCurrentUserId(req);
    const planId = typeof req.params.planId === 'string' ? req.params.planId : (typeof req.body?.planId === 'string' ? req.body.planId : undefined);
    if (!planId) throw new ApiError(400, 'VALIDATION_ERROR', 'Thiếu planId.');

    const itinerary = await AIItineraryService.savePlanToItinerary(actorId, planId);
    return sendSuccess(res, 201, itinerary);
});
