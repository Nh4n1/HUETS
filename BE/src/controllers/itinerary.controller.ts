import type { Request, Response } from 'express';
import * as itineraryService from '../services/itinerary.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const actorFrom = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user;
};

const idFrom = (req: Request) => {
    const value = req.params.id;
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
};

const queryString = (value: unknown) => typeof value === 'string' ? value : undefined;

export const getPublicItineraries = asyncHandler(async (req: Request, res: Response) => {
    const query: itineraryService.PublicItineraryQuery = {};
    const page = queryString(req.query.page);
    const pageSize = queryString(req.query.pageSize);
    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    const result = await itineraryService.getPublicItineraries(query);
    return sendSuccess(res, 200, result.data, result.meta);
});

export const getPublicItineraryById = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await itineraryService.getPublicItineraryById(idFrom(req))));

export const createItinerary = asyncHandler(async (req: Request, res: Response) => {
    console.log('[createItinerary] body received from FE:', JSON.stringify(req.body, null, 2));
    const payload = await itineraryService.createItinerary(req.body, actorFrom(req));
    return sendSuccess(res, 201, payload);
});
export const getItineraries = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await itineraryService.getItineraries(actorFrom(req))));

export const getItineraryById = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await itineraryService.getItineraryById(idFrom(req), actorFrom(req))));

export const updateItinerary = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 200, await itineraryService.updateItinerary(idFrom(req), req.body, actorFrom(req))));

export const deleteItinerary = asyncHandler(async (req: Request, res: Response) => {
    await itineraryService.deleteItinerary(idFrom(req), actorFrom(req));
    return res.status(204).send();
});

export const copyPublicItinerary = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await itineraryService.copyPublicItinerary(idFrom(req), actorFrom(req))));
