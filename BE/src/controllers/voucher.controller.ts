import type { Request, Response } from 'express';
import * as voucherService from '../services/voucher.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const actor = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user;
};
const param = (value: string | string[] | undefined) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
const text = (value: unknown) => typeof value === 'string' ? value : undefined;
const ownerQuery = (req: Request): voucherService.VoucherQuery => {
    const result: voucherService.VoucherQuery = {};
    const status = text(req.query.status);
    const page = text(req.query.page);
    const pageSize = text(req.query.pageSize);
    if (status) result.status = status;
    if (page) result.page = page;
    if (pageSize) result.pageSize = pageSize;
    return result;
};
const publicQuery = (req: Request): voucherService.PublicVoucherQuery => {
    const result: voucherService.PublicVoucherQuery = {};
    const page = text(req.query.page);
    const pageSize = text(req.query.pageSize);
    const sortBy = text(req.query.sortBy);
    const categoryCode = text(req.query.categoryCode);
    if (page) result.page = page;
    if (pageSize) result.pageSize = pageSize;
    if (sortBy) result.sortBy = sortBy;
    if (categoryCode) result.categoryCode = categoryCode;
    return result;
};

export const createVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 201, await voucherService.createVoucher(param(req.params.locationId), req.body, actor(req))));
export const getOwnerVouchers = asyncHandler(async (req: Request, res: Response) => {
    const result = await voucherService.getOwnerVouchers(param(req.params.locationId), actor(req), ownerQuery(req));
    return sendSuccess(res, 200, result.data, result.meta);
});
export const getOwnerVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.getOwnerVoucher(param(req.params.locationId), param(req.params.voucherId), actor(req))));
export const updateVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.updateVoucher(param(req.params.locationId), param(req.params.voucherId), req.body, actor(req))));
export const deleteVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.deleteVoucher(param(req.params.locationId), param(req.params.voucherId), actor(req))));
export const publishVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.publishVoucher(param(req.params.locationId), param(req.params.voucherId), actor(req))));
export const pauseVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.pauseVoucher(param(req.params.locationId), param(req.params.voucherId), actor(req))));
export const resumeVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.resumeVoucher(param(req.params.locationId), param(req.params.voucherId), actor(req))));
export const endVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.endVoucher(param(req.params.locationId), param(req.params.voucherId), actor(req))));
export const listPublicVouchers = asyncHandler(async (req: Request, res: Response) => {
    const result = await voucherService.listPublicVouchers(publicQuery(req), req.user?.id);
    return sendSuccess(res, 200, result.data, result.meta);
});
export const getPublicLocationVouchers = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.getPublicLocationVouchers(param(req.params.locationId), req.user?.id)));
export const getPublicVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.getPublicVoucher(param(req.params.voucherId), req.user?.id)));
export const claimVoucher = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 201, await voucherService.claimVoucher(param(req.params.voucherId), actor(req))));
export const getMyVoucherClaims = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.getMyVoucherClaims(actor(req))));
export const getMyVoucherClaim = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await voucherService.getMyVoucherClaim(param(req.params.claimId), actor(req))));
