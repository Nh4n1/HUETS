import type { Request, Response } from 'express';
import * as reportService from '../services/report.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const param = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

const queryString = (value: unknown) => typeof value === 'string' ? value : undefined;

const currentAdminId = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user.id;
};

export const getReports = asyncHandler(async (req: Request, res: Response) => {
    const query: reportService.AdminReportQuery = {};
    const page = queryString(req.query.page);
    const pageSize = queryString(req.query.pageSize);
    const status = queryString(req.query.status);
    const targetType = queryString(req.query.targetType);
    const reasonCode = queryString(req.query.reasonCode);
    const q = queryString(req.query.q);
    if (page !== undefined) query.page = page;
    if (pageSize !== undefined) query.pageSize = pageSize;
    if (status !== undefined) query.status = status;
    if (targetType !== undefined) query.targetType = targetType;
    if (reasonCode !== undefined) query.reasonCode = reasonCode;
    if (q !== undefined) query.q = q;

    const result = await reportService.getAdminReports(query, currentAdminId(req));
    return sendSuccess(res, 200, result.data, result.meta);
});

export const getReportById = asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.getAdminReportById(param(req.params.reportId), currentAdminId(req));
    return sendSuccess(res, 200, report);
});

export const updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.updateAdminReportStatus(
        param(req.params.reportId),
        req.body,
        currentAdminId(req),
    );
    return sendSuccess(res, 200, report);
});
