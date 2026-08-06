import type { Request, Response } from 'express';
import * as locationService from '../services/location.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const queryString = (value: unknown) => typeof value === 'string' ? value : undefined;

// [POST] /api/locations
export const createLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const location = await locationService.createLocation(req.body, req.user);
    return sendSuccess(res, 201, location);
});

// [GET] /api/locations
export const getPublicLocations = asyncHandler(async (req: Request, res: Response) => {
    const query: locationService.PublicLocationQuery = {};
    const page = queryString(req.query.page);
    const pageSize = queryString(req.query.pageSize);
    const categoryCode = queryString(req.query.categoryCode);
    const wardCode = queryString(req.query.wardCode);

    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (categoryCode) query.categoryCode = categoryCode;
    if (wardCode) query.wardCode = wardCode;

    const result = await locationService.getPublicLocations(query);
    return sendSuccess(res, 200, result.data, result.meta);
});


// [GET] /api/locations/:locationId
export const getPublicLocationById = asyncHandler(async (req: Request, res: Response) => {
    const locationId = req.params.locationId;
    const location = await locationService.getPublicLocationById(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
    );
    return sendSuccess(res, 200, location);
});

// [GET] /api/admin/locations/moderation
export const getAdminLocations = asyncHandler(async (req: Request, res: Response) => {
    const query: locationService.AdminLocationQuery = {};
    const page = queryString(req.query.page);
    const pageSize = queryString(req.query.pageSize);
    const status = queryString(req.query.status);
    const categoryCode = queryString(req.query.categoryCode);
    const wardCode = queryString(req.query.wardCode);

    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (status) query.status = status;
    if (categoryCode) query.categoryCode = categoryCode;
    if (wardCode) query.wardCode = wardCode;

    const result = await locationService.getAdminLocations(query);
    return sendSuccess(res, 200, result.data, result.meta);
});

// [GET] /api/admin/locations/:locationId
export const getAdminLocationById = asyncHandler(async (req: Request, res: Response) => {
    const locationId = req.params.locationId;
    const location = await locationService.getAdminLocationById(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
    );
    return sendSuccess(res, 200, location);
});

// [POST] /api/admin/locations/:locationId/approve
export const approveLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const locationId = req.params.locationId;
    const location = await locationService.approveLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    return sendSuccess(res, 200, location);
});

// [POST] /api/admin/locations/:locationId/reject
export const rejectLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const locationId = req.params.locationId;
    const location = await locationService.rejectLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    return sendSuccess(res, 200, location);
});
