import type { NextFunction, Request, Response } from 'express';
import { redemptionConfig } from '../config/redemption.config.ts';
import { hashOpaqueToken } from '../helpers/opaqueToken.helper.ts';
import Location from '../models/location.model.ts';
import LocationOwnership from '../models/locationOwnership.model.ts';
import RedemptionDevice from '../models/redemptionDevice.model.ts';
import { ApiError } from '../utils/apiError.ts';

declare module 'express-serve-static-core' {
    interface Request {
        redemptionDevice?: {
            id: string;
            locationId: string;
            ownershipId: string;
            name: string;
            locationName: string;
        };
    }
}

export const authenticateRedemptionDevice = async (req: Request, _res: Response, next: NextFunction) => {
    const rawToken = req.cookies?.[redemptionConfig.deviceCookieName];
    if (typeof rawToken !== 'string' || !rawToken) return next(new ApiError(401, 'DEVICE_SESSION_REQUIRED', 'Thiết bị chưa được kích hoạt.'));
    const device = await RedemptionDevice.findOne({ sessionTokenHash: hashOpaqueToken(rawToken) });
    if (!device) return next(new ApiError(401, 'DEVICE_SESSION_REQUIRED', 'Phiên thiết bị không hợp lệ.'));
    if (device.status !== 'active' || device.sessionExpiresAt <= new Date()) return next(new ApiError(403, 'DEVICE_REVOKED', 'Thiết bị đã bị thu hồi hoặc phiên đã hết hạn.'));
    const [ownership, location] = await Promise.all([
        LocationOwnership.findById(device.ownershipId).select({ status: 1 }).lean(),
        Location.findById(device.locationId).select({ status: 1, isDeleted: 1, name: 1 }).lean(),
    ]);
    if (ownership?.status !== 'verified') return next(new ApiError(403, 'OWNERSHIP_NOT_ACTIVE', 'Quyền quản lý Location không còn hiệu lực.'));
    if (location?.status !== 'approved' || location.isDeleted === true) return next(new ApiError(403, 'LOCATION_NOT_PUBLIC', 'Location hiện không đủ điều kiện redemption.'));
    req.redemptionDevice = {
        id: device._id.toString(), locationId: device.locationId.toString(),
        ownershipId: device.ownershipId.toString(), name: device.name,
        locationName: location.name,
    };
    device.lastSeenAt = new Date();
    void device.save().catch(() => {});
    return next();
};
