import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { redemptionConfig } from '../config/redemption.config.ts';
import { generateFriendlyCode, generateOpaqueToken, hashOpaqueToken, normalizeFriendlyCode } from '../helpers/opaqueToken.helper.ts';
import Location from '../models/location.model.ts';
import LocationOwnership from '../models/locationOwnership.model.ts';
import RedemptionDevice from '../models/redemptionDevice.model.ts';
import RedemptionSession from '../models/redemptionSession.model.ts';
import User from '../models/user.model.ts';
import Voucher from '../models/voucher.model.ts';
import VoucherClaim from '../models/voucherClaim.model.ts';
import VoucherRedemption from '../models/voucherRedemption.model.ts';
import { isLocationPublicValid } from './locationOwnership.service.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor { id: string; role: 'user' | 'mod' | 'admin' }
export interface DeviceActor { id: string; locationId: string; ownershipId: string; name: string; locationName?: string }
type RedemptionMethod = 'qr' | 'code';

const verificationSecret = process.env.REDEMPTION_VERIFICATION_SECRET || 'dev_redemption_verification_secret_change_me';

interface VerificationPayload {
    type: 'redemption_verification';
    deviceId: string;
    sessionId: string;
    method: RedemptionMethod;
}

const validId = (id: string, message: string) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'NOT_FOUND', message);
};

const claimContext = async (claim: any, session?: mongoose.ClientSession) => {
    const locationQuery = Location.findById(claim.locationId).select({ status: 1, isDeleted: 1 });
    const ownershipQuery = LocationOwnership.findById(claim.issuedByOwnershipId).select({ status: 1 });
    if (session) {
        // The MongoDB driver does not support parallel operations in one transaction.
        // Run these reads sequentially when they share a ClientSession.
        const location = await locationQuery.session(session).lean();
        const ownership = await ownershipQuery.session(session).lean();
        return { location, ownership };
    }
    const [location, ownership] = await Promise.all([locationQuery.lean(), ownershipQuery.lean()]);
    return { location, ownership };
};

const assertClaimRedeemable = (claim: any, location: any, ownership: any) => {
    if (claim.status === 'used') throw new ApiError(409, 'ALREADY_USED', 'Voucher đã được sử dụng trước đó.', { usedAt: claim.usedAt });
    if (claim.redeemUntil < new Date()) throw new ApiError(409, 'CLAIM_EXPIRED', 'VoucherClaim đã hết hạn sử dụng.');
    if (!isLocationPublicValid(location)) throw new ApiError(403, 'LOCATION_NOT_PUBLIC', 'Location hiện không đủ điều kiện redemption.');
    if (ownership?.status !== 'verified') throw new ApiError(403, 'OWNERSHIP_NOT_ACTIVE', 'Issuing ownership không còn hiệu lực.');
};

export const createRedemptionSession = async (claimId: string, actor: Actor) => {
    validId(claimId, 'Không tìm thấy VoucherClaim.');
    const claim = await VoucherClaim.findOne({ _id: claimId, userId: actor.id });
    if (!claim) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy VoucherClaim.');
    const { location, ownership } = await claimContext(claim);
    assertClaimRedeemable(claim, location, ownership);
    const token = generateOpaqueToken();
    const displayCode = generateFriendlyCode(6, 'HT');
    const expiresAt = new Date(Date.now() + redemptionConfig.redemptionSessionTtlMs);
    const redemptionSession = await RedemptionSession.create({
        voucherClaimId: claim._id,
        userId: actor.id,
        tokenHash: hashOpaqueToken(token),
        displayCodeHash: hashOpaqueToken(displayCode),
        expiresAt,
        consumedAt: null,
    });
    return {
        id: redemptionSession._id.toString(),
        token,
        displayCode,
        qrValue: token,
        expiresAt,
    };
};

const resolveRedemptionSession = async (input: unknown) => {
    if (!input || typeof input !== 'object') throw new ApiError(422, 'INVALID_REDEMPTION_CODE', 'Mã redemption không hợp lệ.');
    const raw = input as { token?: unknown; displayCode?: unknown; method?: unknown };
    if (!['qr', 'code'].includes(String(raw.method))) throw new ApiError(422, 'INVALID_REDEMPTION_CODE', 'Phương thức redemption không hợp lệ.');
    const method = raw.method as RedemptionMethod;
    const value = method === 'qr'
        ? (typeof raw.token === 'string' ? raw.token.trim() : '')
        : normalizeFriendlyCode(raw.displayCode);
    if (!value) throw new ApiError(422, 'INVALID_REDEMPTION_CODE', 'Mã redemption không hợp lệ.');
    const filter = method === 'qr' ? { tokenHash: hashOpaqueToken(value) } : { displayCodeHash: hashOpaqueToken(value) };
    const session = await RedemptionSession.findOne(filter);
    if (!session) throw new ApiError(404, 'INVALID_REDEMPTION_CODE', 'Mã không đúng hoặc không còn hiệu lực.');
    if (session.consumedAt) throw new ApiError(409, 'ALREADY_USED', 'Phiên redemption đã được sử dụng.');
    if (session.expiresAt <= new Date()) throw new ApiError(409, 'REDEMPTION_SESSION_EXPIRED', 'Mã redemption đã hết hạn.');
    return { session, method };
};

export const verifyRedemption = async (input: unknown, device: DeviceActor) => {
    const resolved = await resolveRedemptionSession(input);
    const claim = await VoucherClaim.findById(resolved.session.voucherClaimId).lean();
    if (!claim) throw new ApiError(404, 'INVALID_REDEMPTION_CODE', 'Mã không đúng hoặc không còn hiệu lực.');
    if (claim.locationId.toString() !== device.locationId || claim.issuedByOwnershipId.toString() !== device.ownershipId) {
        throw new ApiError(403, 'WRONG_LOCATION', 'Voucher không áp dụng tại Location của thiết bị này.');
    }
    const { location, ownership } = await claimContext(claim);
    assertClaimRedeemable(claim, location, ownership);
    const user = await User.findById(claim.userId).select({ displayName: 1 }).lean();
    const verificationToken = jwt.sign({
        type: 'redemption_verification',
        deviceId: device.id,
        sessionId: resolved.session._id.toString(),
        method: resolved.method,
    } satisfies VerificationPayload, verificationSecret, { expiresIn: redemptionConfig.verificationTokenTtlSeconds });
    return {
        verificationToken,
        expiresInSeconds: redemptionConfig.verificationTokenTtlSeconds,
        claim: {
            title: claim.voucherTitleSnapshot,
            benefit: claim.benefitSnapshot,
            terms: claim.termsSnapshot,
            redeemUntil: claim.redeemUntil,
            customerDisplayName: user?.displayName ?? null,
            location: claim.locationSnapshot,
        },
    };
};

const parseVerificationToken = (rawToken: unknown): VerificationPayload => {
    if (typeof rawToken !== 'string') throw new ApiError(422, 'REDEMPTION_STATE_CONFLICT', 'Verification token không hợp lệ.');
    try {
        const payload = jwt.verify(rawToken, verificationSecret) as Partial<VerificationPayload>;
        if (payload.type !== 'redemption_verification' || typeof payload.deviceId !== 'string' || typeof payload.sessionId !== 'string' || !['qr', 'code'].includes(payload.method ?? '')) throw new Error('Invalid payload');
        return payload as VerificationPayload;
    } catch {
        throw new ApiError(409, 'REDEMPTION_STATE_CONFLICT', 'Kết quả verify đã hết hạn. Hãy kiểm tra lại Voucher.');
    }
};

export const confirmRedemption = async (rawToken: unknown, device: DeviceActor) => {
    const verification = parseVerificationToken(rawToken);
    if (verification.deviceId !== device.id) throw new ApiError(403, 'WRONG_LOCATION', 'Kết quả verify không thuộc thiết bị này.');
    validId(verification.sessionId, 'Không tìm thấy Redemption Session.');
    const mongoSession = await mongoose.startSession();
    let result: { transactionCode: string; redeemedAt: Date } | null = null;
    try {
        await mongoSession.withTransaction(async () => {
            const redemptionSession = await RedemptionSession.findById(verification.sessionId).session(mongoSession);
            const currentDevice = await RedemptionDevice.findOne({
                _id: device.id,
                status: 'active',
                sessionExpiresAt: { $gt: new Date() },
            }).session(mongoSession).lean();
            if (!currentDevice) throw new ApiError(403, 'DEVICE_REVOKED', 'Thiết bị đã bị thu hồi.');
            if (!redemptionSession) throw new ApiError(404, 'INVALID_REDEMPTION_CODE', 'Không tìm thấy Redemption Session.');
            if (redemptionSession.consumedAt) throw new ApiError(409, 'ALREADY_USED', 'Phiên redemption đã được sử dụng.');
            if (redemptionSession.expiresAt <= new Date()) throw new ApiError(409, 'REDEMPTION_SESSION_EXPIRED', 'Mã redemption đã hết hạn.');
            const claim = await VoucherClaim.findById(redemptionSession.voucherClaimId).session(mongoSession);
            if (!claim) throw new ApiError(404, 'INVALID_REDEMPTION_CODE', 'VoucherClaim không còn tồn tại.');
            if (claim.locationId.toString() !== device.locationId || claim.issuedByOwnershipId.toString() !== device.ownershipId) throw new ApiError(403, 'WRONG_LOCATION', 'Voucher không áp dụng tại Location này.');
            const { location, ownership } = await claimContext(claim, mongoSession);
            assertClaimRedeemable(claim, location, ownership);
            const redeemedAt = new Date();
            const updated = await VoucherClaim.findOneAndUpdate(
                { _id: claim._id, status: 'available', redeemUntil: { $gte: redeemedAt } },
                { $set: { status: 'used', usedAt: redeemedAt } },
                { new: true, session: mongoSession },
            );
            if (!updated) throw new ApiError(409, 'ALREADY_USED', 'Voucher đã được sử dụng bởi thao tác khác.');
            const transactionCode = generateFriendlyCode(10, 'HTR');
            const redemption = new VoucherRedemption({
                voucherClaimId: claim._id,
                voucherId: claim.voucherId,
                locationId: claim.locationId,
                userId: claim.userId,
                ownershipId: claim.issuedByOwnershipId,
                redeemedByDeviceId: device.id,
                method: verification.method,
                redeemedAt,
                voucherSnapshot: {
                    title: claim.voucherTitleSnapshot,
                    description: claim.voucherDescriptionSnapshot,
                    benefit: claim.benefitSnapshot,
                    terms: claim.termsSnapshot,
                    location: claim.locationSnapshot,
                },
                transactionCode,
            });
            await redemption.save({ session: mongoSession });
            updated.redemptionId = redemption._id;
            await updated.save({ session: mongoSession });
            redemptionSession.consumedAt = redeemedAt;
            await redemptionSession.save({ session: mongoSession });
            await Voucher.updateOne({ _id: claim.voucherId }, { $inc: { redeemedCount: 1 } }, { session: mongoSession });
            result = { transactionCode, redeemedAt };
        });
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) throw new ApiError(409, 'ALREADY_USED', 'Voucher đã được sử dụng bởi thao tác khác.');
        throw error;
    } finally { await mongoSession.endSession(); }
    if (!result) throw new ApiError(409, 'REDEMPTION_STATE_CONFLICT', 'Không thể xác nhận redemption.');
    return { code: 'REDEMPTION_SUCCESS', ...(result as { transactionCode: string; redeemedAt: Date }) };
};
