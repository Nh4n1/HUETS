import type { Request, Response } from 'express';
import { redemptionConfig } from '../config/redemption.config.ts';
import * as deviceService from '../services/redemptionDevice.service.ts';
import * as redemptionService from '../services/voucherRedemption.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

const actor = (req: Request) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    return req.user;
};
const device = (req: Request) => {
    if (!req.redemptionDevice) throw new ApiError(401, 'DEVICE_SESSION_REQUIRED', 'Thiết bị chưa được kích hoạt.');
    return req.redemptionDevice;
};
const param = (value: string | string[] | undefined) => Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
const cookieOptions = {
    httpOnly: true,
    secure: redemptionConfig.secureCookie,
    sameSite: 'strict' as const,
    path: '/api/redeem-device',
    maxAge: redemptionConfig.deviceSessionTtlMs,
};

export const createActivationCode = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 201, await deviceService.createActivationCode(param(req.params.locationId), req.body, actor(req))));
export const getDevices = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await deviceService.getDevices(param(req.params.locationId), actor(req))));
export const revokeDevice = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await deviceService.revokeDevice(param(req.params.locationId), param(req.params.deviceId), actor(req))));

export const activateDevice = asyncHandler(async (req: Request, res: Response) => {
    const result = await deviceService.activateDevice(req.body?.activationCode);
    res.cookie(redemptionConfig.deviceCookieName, result.sessionToken, cookieOptions);
    return sendSuccess(res, 201, result.device);
});

export const getDeviceSession = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, device(req)));

export const logoutDevice = asyncHandler(async (req: Request, res: Response) => {
    await deviceService.disconnectDevice(device(req).id);
    res.clearCookie(redemptionConfig.deviceCookieName, cookieOptions);
    return sendSuccess(res, 200, { disconnected: true });
});

export const createRedemptionSession = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 201, await redemptionService.createRedemptionSession(param(req.params.claimId), actor(req))));
export const verifyRedemption = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await redemptionService.verifyRedemption(req.body, device(req))));
export const confirmRedemption = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, 200, await redemptionService.confirmRedemption(req.body?.verificationToken, device(req))));
