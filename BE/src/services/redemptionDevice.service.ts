import mongoose from 'mongoose';
import DeviceActivationCode from '../models/deviceActivationCode.model.ts';
import RedemptionDevice from '../models/redemptionDevice.model.ts';
import { generateFriendlyCode, generateOpaqueToken, hashOpaqueToken, normalizeFriendlyCode } from '../helpers/opaqueToken.helper.ts';
import { redemptionConfig } from '../config/redemption.config.ts';
import { requireVerifiedOwnership } from './locationOwnership.service.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor { id: string; role: 'user' | 'mod' | 'admin' }

const deviceDto = (device: any) => ({
    id: device._id.toString(), locationId: device.locationId.toString(), ownershipId: device.ownershipId.toString(),
    name: device.name, status: device.status, activatedAt: device.activatedAt,
    lastSeenAt: device.lastSeenAt, revokedAt: device.revokedAt,
});

export const createActivationCode = async (locationId: string, rawInput: unknown, actor: Actor) => {
    const ownership = await requireVerifiedOwnership(actor.id, locationId);
    const suggestedDeviceName = typeof (rawInput as { name?: unknown })?.name === 'string'
        ? (rawInput as { name: string }).name.trim()
        : '';
    if (suggestedDeviceName.length < 2 || suggestedDeviceName.length > 100) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Tên thiết bị phải từ 2 đến 100 ký tự.');
    }
    const activeCodes = await DeviceActivationCode.countDocuments({
        ownershipId: ownership._id,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
    });
    if (activeCodes >= 5) throw new ApiError(409, 'CONFLICT', 'Đã có quá nhiều Activation Code còn hiệu lực.');
    const code = generateFriendlyCode(8, 'HTD');
    const expiresAt = new Date(Date.now() + redemptionConfig.activationTtlMs);
    await DeviceActivationCode.create({
        codeHash: hashOpaqueToken(code), locationId, ownershipId: ownership._id,
        createdByUserId: actor.id, suggestedDeviceName, expiresAt,
        consumedAt: null, failedAttempts: 0,
    });
    return { activationCode: code, expiresAt };
};

export const activateDevice = async (rawCode: unknown) => {
    const code = normalizeFriendlyCode(rawCode);
    if (code.length < 8) throw new ApiError(422, 'INVALID_ACTIVATION_CODE', 'Activation Code không hợp lệ.');
    const session = await mongoose.startSession();
    let rawSessionToken = '';
    let deviceResult: any = null;
    try {
        await session.withTransaction(async () => {
            const activation = await DeviceActivationCode.findOne({ codeHash: hashOpaqueToken(code) }).session(session);
            if (!activation) throw new ApiError(404, 'INVALID_ACTIVATION_CODE', 'Activation Code không đúng hoặc không còn hiệu lực.');
            if (activation.consumedAt) throw new ApiError(409, 'ACTIVATION_CODE_CONSUMED', 'Activation Code đã được sử dụng.');
            if (activation.expiresAt <= new Date()) throw new ApiError(409, 'ACTIVATION_CODE_EXPIRED', 'Activation Code đã hết hạn.');
            const ownership = await requireVerifiedOwnership(activation.createdByUserId.toString(), activation.locationId.toString());
            if (ownership._id.toString() !== activation.ownershipId.toString()) throw new ApiError(409, 'OWNERSHIP_NOT_ACTIVE', 'Issuing ownership không còn hiệu lực.');
            const now = new Date();
            rawSessionToken = generateOpaqueToken();
            const device = new RedemptionDevice({
                locationId: activation.locationId,
                ownershipId: activation.ownershipId,
                name: activation.suggestedDeviceName,
                sessionTokenHash: hashOpaqueToken(rawSessionToken),
                sessionExpiresAt: new Date(now.getTime() + redemptionConfig.deviceSessionTtlMs),
                status: 'active', activatedAt: now, lastSeenAt: now,
                revokedAt: null, revokedBy: null,
            });
            await device.save({ session });
            activation.consumedAt = now;
            await activation.save({ session });
            deviceResult = deviceDto(device);
        });
    } finally { await session.endSession(); }
    return { device: deviceResult, sessionToken: rawSessionToken };
};

export const getDevices = async (locationId: string, actor: Actor) => {
    const ownership = await requireVerifiedOwnership(actor.id, locationId);
    const devices = await RedemptionDevice.find({ ownershipId: ownership._id }).sort({ activatedAt: -1 }).lean();
    return devices.map(deviceDto);
};

export const revokeDevice = async (locationId: string, deviceId: string, actor: Actor) => {
    if (!mongoose.isValidObjectId(deviceId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy thiết bị.');
    const ownership = await requireVerifiedOwnership(actor.id, locationId);
    const now = new Date();
    const device = await RedemptionDevice.findOneAndUpdate(
        { _id: deviceId, locationId, ownershipId: ownership._id, status: 'active' },
        { $set: { status: 'revoked', revokedAt: now, revokedBy: actor.id } },
        { new: true },
    );
    if (!device) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy thiết bị active thuộc Location này.');
    return deviceDto(device);
};

export const disconnectDevice = async (deviceId: string) => {
    await RedemptionDevice.updateOne(
        { _id: deviceId, status: 'active' },
        { $set: { status: 'revoked', revokedAt: new Date() } },
    );
};
