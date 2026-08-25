import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as aiItineraryService from '../services/aiItinerary.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const actorFrom = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user;
};
const planIdFrom = (req: Request) => {
    const value = req.params.planId;
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
};
const withSchemaErrors = async <T>(operation: () => Promise<T>) => {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin tạo lịch trình AI không hợp lệ.', {
                fields: error.flatten().fieldErrors,
            });
        }
        throw error;
    }
};

export const createPlan = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await withSchemaErrors(() =>
        aiItineraryService.createAiItineraryPlan(req.body, actorFrom(req)))));

export const getPlan = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await aiItineraryService.getAiItineraryPlan(planIdFrom(req), actorFrom(req))));

export const updatePlan = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await withSchemaErrors(() =>
        aiItineraryService.updateAiItineraryPlan(planIdFrom(req), req.body, actorFrom(req)))));

export const savePlan = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await withSchemaErrors(() =>
        aiItineraryService.saveAiItineraryPlan(req.body, actorFrom(req)))));
