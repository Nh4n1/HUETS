import type { Request, Response } from 'express';
import * as ownershipService from '../services/locationOwnership.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const actor = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user;
};

const param = (value: string | string[] | undefined) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
const query = (value: unknown) => typeof value === 'string' ? value : undefined;

const ownershipQuery = (req: Request): ownershipService.OwnershipQuery => {
    const result: ownershipService.OwnershipQuery = {};
    const status = query(req.query.status);
    const page = query(req.query.page);
    const pageSize = query(req.query.pageSize);
    const q = query(req.query.q);
    const locationMode = query(req.query.locationMode);
    if (status) result.status = status;
    if (page) result.page = page;
    if (pageSize) result.pageSize = pageSize;
    if (q) result.q = q;
    if (locationMode) result.locationMode = locationMode;
    return result;
};

export const createOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 201, await ownershipService.createOwnership(req.body, actor(req)))
));

export const getBusinessSummary = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.getBusinessSummary(actor(req)))
));

export const getMyOwnerships = asyncHandler(async (req: Request, res: Response) => {
    const result = await ownershipService.getMyOwnerships(actor(req), ownershipQuery(req));
    return sendSuccess(res, 200, result.data, result.meta);
});

export const getMyOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.getMyOwnership(param(req.params.ownershipId), actor(req)))
));

export const updateMyOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.updateMyOwnership(
        param(req.params.ownershipId), req.body, actor(req),
    ))
));

export const resubmitMyOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.resubmitMyOwnership(param(req.params.ownershipId), actor(req)))
));

export const cancelMyOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.cancelMyOwnership(param(req.params.ownershipId), actor(req)))
));

export const getAdminOwnerships = asyncHandler(async (req: Request, res: Response) => {
    const result = await ownershipService.getAdminOwnerships(ownershipQuery(req));
    return sendSuccess(res, 200, result.data, result.meta);
});

export const getAdminOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.getAdminOwnership(param(req.params.ownershipId)))
));

export const approveOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.approveOwnership(param(req.params.ownershipId), actor(req)))
));

export const rejectOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.rejectOwnership(
        param(req.params.ownershipId), req.body, actor(req),
    ))
));

export const revokeOwnership = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.revokeOwnership(
        param(req.params.ownershipId), req.body, actor(req),
    ))
));

export const getBusinessLocations = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.getBusinessLocations(actor(req)))
));

export const getLocationOwnershipContext = asyncHandler(async (req: Request, res: Response) => (
    sendSuccess(res, 200, await ownershipService.getLocationOwnershipContext(
        param(req.params.locationId), req.user?.id,
    ))
));
