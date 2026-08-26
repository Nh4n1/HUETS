import type { Request, Response } from 'express';
import * as locationService from '../services/location.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';
import { deleteLocationImage } from '../services/upload.service.ts';

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
    const q = queryString(req.query.q);
    const categoryCode = queryString(req.query.categoryCode);
    const wardCode = queryString(req.query.wardCode);
    const tagCodes = queryString(req.query.tagCodes);
    const sortBy = queryString(req.query.sortBy);
    const includeVoucherSummary = queryString(req.query.includeVoucherSummary);

    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (q !== undefined) query.q = q;
    if (categoryCode) query.categoryCode = categoryCode;
    if (wardCode) query.wardCode = wardCode;
    if (tagCodes !== undefined) query.tagCodes = tagCodes;
    if (includeVoucherSummary !== undefined) {
        if (!['true', 'false'].includes(includeVoucherSummary)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'includeVoucherSummary khÃ´ng há»£p lá»‡.');
        }
        query.includeVoucherSummary = includeVoucherSummary === 'true';
    }
    if (sortBy) {
        if (!['recommended', 'rating_desc', 'newest'].includes(sortBy)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'sortBy không hợp lệ.');
        }
        query.sortBy = sortBy as locationService.PublicLocationSortBy;
    }

    const result = await locationService.getPublicLocations(query);
    return sendSuccess(res, 200, result.data, result.meta);
});

// [GET] /api/locations/search
export const searchPublicLocations = getPublicLocations;


// [GET] /api/locations/:locationId
export const getPublicLocationById = asyncHandler(async (req: Request, res: Response) => {
    const locationId = req.params.locationId;
    const location = await locationService.getPublicLocationById(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
    );
    return sendSuccess(res, 200, location);
});

// [GET] /api/me/locations
export const getMyLocations = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const query: locationService.MyLocationQuery = {};
    const page = queryString(req.query.page);
    const pageSize = queryString(req.query.pageSize);
    const status = queryString(req.query.status);

    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (status) query.status = status;

    const result = await locationService.getMyLocations(req.user, query);
    return sendSuccess(res, 200, result.data, result.meta);
});

// [GET] /api/me/locations/:locationId
export const getMyLocationById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const locationId = req.params.locationId;
    const location = await locationService.getMyLocationById(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.user,
    );
    return sendSuccess(res, 200, location);
});

// [PATCH] /api/me/locations/:locationId
export const updateMyLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const locationId = req.params.locationId;
    const result = await locationService.updateMyLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    await Promise.allSettled(result.removedPublicIds.map((publicId) => deleteLocationImage(publicId)));
    return sendSuccess(res, 200, result.location);
});

// [POST] /api/me/locations/:locationId/resubmit
export const resubmitMyLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const locationId = req.params.locationId;
    const location = await locationService.resubmitMyLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    return sendSuccess(res, 200, location);
});

// [POST] /api/me/locations/:locationId/withdraw
export const withdrawMyLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const locationId = req.params.locationId;
    const location = await locationService.withdrawMyLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    return sendSuccess(res, 200, location);
});

// [DELETE] /api/me/locations/:locationId
export const deleteMyWithdrawnLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const locationId = req.params.locationId;
    const result = await locationService.deleteMyWithdrawnLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body ?? {},
        req.user,
    );
    await Promise.allSettled(result.removedPublicIds.map((publicId) => deleteLocationImage(publicId)));
    return sendSuccess(res, 200, { deleted: result.deleted });
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

// [PATCH] /api/admin/locations/:locationId
export const updateAdminLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const locationId = req.params.locationId;
    const result = await locationService.updateAdminLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );

    await Promise.allSettled(
        result.removedPublicIds.map((publicId) => deleteLocationImage(publicId)),
    );
    return sendSuccess(res, 200, result.location);
});

// [DELETE] /api/admin/locations/:locationId
export const deleteAdminLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const locationId = req.params.locationId;
    const result = await locationService.deleteAdminLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body ?? {},
        req.user,
    );
    return sendSuccess(res, 200, result);
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

// [POST] /api/admin/locations/:locationId/hide
export const hideLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const locationId = req.params.locationId;
    const location = await locationService.hideLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    return sendSuccess(res, 200, location);
});

// [POST] /api/admin/locations/:locationId/restore
export const restoreLocation = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const locationId = req.params.locationId;
    const location = await locationService.restoreLocation(
        Array.isArray(locationId) ? (locationId[0] ?? '') : (locationId ?? ''),
        req.body,
        req.user,
    );
    return sendSuccess(res, 200, location);
});
