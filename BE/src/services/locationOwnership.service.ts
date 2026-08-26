import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import { ZodError } from 'zod';
import { verifyOwnershipEvidenceAssetToken } from '../helpers/ownershipEvidenceAssetToken.helper.ts';
import Location from '../models/location.model.ts';
import LocationOwnership, {
    ownershipActiveKey,
} from '../models/locationOwnership.model.ts';
import type {
    ILocationOwnership,
    IOwnershipEvidenceImage,
    LocationOwnershipStatus,
} from '../models/locationOwnership.model.ts';
import User from '../models/user.model.ts';
import {
    createOwnershipSchema,
    ownershipClaimSchema,
    ownershipReviewSchema,
    updateOwnershipSchema,
} from '../schemas/locationOwnership.schema.ts';
import { createLocation } from './location.service.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor {
    id: string;
    role: 'user' | 'mod' | 'admin';
}

export interface OwnershipQuery {
    status?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    locationMode?: string;
}

const ACTIVE_USER_STATUSES: LocationOwnershipStatus[] = ['pending', 'verified', 'rejected'];
const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_EVIDENCE_TOTAL_SIZE = 20 * 1024 * 1024;

const zodApiError = (error: ZodError) => new ApiError(
    422,
    error.issues.some((issue) => issue.path.includes('evidenceAssetTokens'))
        ? 'OWNERSHIP_EVIDENCE_REQUIRED'
        : 'VALIDATION_ERROR',
    error.issues[0]?.message ?? 'Dữ liệu ownership không hợp lệ.',
    { issues: error.issues },
);

const parseWith = <T>(schema: { parse(value: unknown): T }, value: unknown): T => {
    try {
        return schema.parse(value);
    } catch (error) {
        if (error instanceof ZodError) throw zodApiError(error);
        throw error;
    }
};

const assertObjectId = (id: string, code: 'OWNERSHIP_NOT_FOUND' | 'LOCATION_NOT_CLAIMABLE') => {
    if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(404, code, code === 'OWNERSHIP_NOT_FOUND'
            ? 'Không tìm thấy yêu cầu ownership.'
            : 'Địa điểm không đủ điều kiện để xác minh quyền quản lý.');
    }
};

const parsePage = (value: string | undefined, fallback: number, max?: number) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin phân trang không hợp lệ.');
    }
    return max ? Math.min(parsed, max) : parsed;
};

export const isLocationPublicValid = (location: { status?: unknown; isDeleted?: unknown } | null | undefined) => (
    location?.status === 'approved' && location.isDeleted !== true
);

const evidenceFromTokens = (tokens: string[], actorId: string): IOwnershipEvidenceImage[] => {
    let totalSize = 0;
    const seen = new Set<string>();
    const images = tokens.map((token) => {
        try {
            const asset = verifyOwnershipEvidenceAssetToken(token);
            if (asset.sub !== actorId || asset.sizeBytes <= 0 || asset.sizeBytes > MAX_EVIDENCE_FILE_SIZE) {
                throw new Error('Evidence owner or size is invalid.');
            }
            const url = new URL(asset.url);
            if (url.protocol !== 'https:') throw new Error('Evidence URL is invalid.');
            const key = asset.publicId ?? asset.url;
            if (seen.has(key)) throw new Error('Duplicate evidence asset.');
            seen.add(key);
            totalSize += asset.sizeBytes;
            return {
                url: asset.url,
                publicId: asset.publicId ?? null,
                mimeType: asset.mimeType,
                sizeBytes: asset.sizeBytes,
            };
        } catch {
            throw new ApiError(
                422,
                'OWNERSHIP_EVIDENCE_REQUIRED',
                'Ảnh bằng chứng không hợp lệ hoặc token đã hết hạn.',
            );
        }
    });
    if (totalSize > MAX_EVIDENCE_TOTAL_SIZE) {
        throw new ApiError(422, 'INVALID_IMAGE_SIZE', 'Tổng dung lượng ảnh không được vượt quá 20 MB.');
    }
    return images;
};

const locationSummary = (location: any) => location ? ({
    id: location._id.toString(),
    name: location.name,
    status: location.status,
    isDeleted: location.isDeleted === true,
    formattedAddress: [
        location.address?.addressLine,
        location.address?.wardNameSnapshot,
        'Thành phố Huế',
    ].filter(Boolean).join(', '),
    coverImageUrl: [...(location.images ?? [])]
        .sort((left, right) => left.position - right.position)[0]?.url ?? null,
}) : null;

const applicantSummary = (user: any) => user ? ({
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    status: user.status,
}) : null;

const ownershipDto = (ownership: any, includeEvidence = true) => ({
    id: ownership._id.toString(),
    userId: ownership.userId?._id?.toString?.() ?? ownership.userId.toString(),
    locationId: ownership.locationId?._id?.toString?.() ?? ownership.locationId.toString(),
    locationMode: ownership.locationMode,
    status: ownership.status,
    relationship: ownership.relationship,
    contactName: ownership.contactName,
    contactPhone: ownership.contactPhone,
    contactEmail: ownership.contactEmail,
    note: ownership.note,
    ...(includeEvidence ? { evidenceImages: ownership.evidenceImages } : {}),
    submittedAt: ownership.submittedAt,
    verifiedAt: ownership.verifiedAt,
    revokedAt: ownership.revokedAt,
    reviewHistory: ownership.reviewHistory,
    location: locationSummary(ownership.locationId),
    applicant: applicantSummary(ownership.userId),
    createdAt: ownership.createdAt,
    updatedAt: ownership.updatedAt,
});

const assertApplicant = async (actor: Actor) => {
    if (actor.role !== 'user' || !mongoose.isValidObjectId(actor.id)) {
        throw new ApiError(403, 'FORBIDDEN', 'Chỉ tài khoản User được gửi yêu cầu ownership.');
    }
    const user = await User.findOne({ _id: actor.id, status: 'active', role: 'user' }).select({ _id: 1 }).lean();
    if (!user) throw new ApiError(403, 'FORBIDDEN', 'Tài khoản không đủ điều kiện gửi yêu cầu ownership.');
    return user;
};

const ensureNoReusableRequest = async (userId: string, locationId: string, session?: ClientSession) => {
    const query = LocationOwnership.findOne({
        userId,
        locationId,
        status: { $in: ACTIVE_USER_STATUSES },
    }).select({ _id: 1, status: 1 });
    if (session) query.session(session);
    const existing = await query.lean();
    if (existing) {
        throw new ApiError(
            409,
            'DUPLICATE_ACTIVE_OWNERSHIP',
            existing.status === 'rejected'
                ? 'Yêu cầu trước đã bị từ chối. Hãy bổ sung và gửi lại yêu cầu đó.'
                : 'Bạn đã có yêu cầu ownership đang hoạt động cho địa điểm này.',
            { ownershipId: existing._id.toString(), status: existing.status },
        );
    }
};

const createOwnershipDocument = async (
    userId: string,
    locationId: string,
    locationMode: 'existing' | 'new',
    claimInput: unknown,
    session?: ClientSession,
) => {
    const claim = parseWith(ownershipClaimSchema, claimInput);
    const evidenceImages = evidenceFromTokens(claim.evidenceAssetTokens, userId);
    await ensureNoReusableRequest(userId, locationId, session);
    const hasVerifiedOwnerQuery = LocationOwnership.exists({ locationId, status: 'verified' });
    if (session) hasVerifiedOwnerQuery.session(session);
    if (await hasVerifiedOwnerQuery) {
        throw new ApiError(
            409,
            'LOCATION_ALREADY_HAS_VERIFIED_OWNER',
            'Địa điểm đã có người quản lý được xác minh.',
        );
    }

    const now = new Date();
    const ownership = new LocationOwnership({
        userId,
        locationId,
        locationMode,
        status: 'pending',
        relationship: claim.relationship,
        contactName: claim.contactName,
        contactPhone: claim.contactPhone,
        contactEmail: claim.contactEmail?.toLowerCase() ?? null,
        note: claim.note,
        evidenceImages,
        activeKey: ownershipActiveKey(userId, locationId),
        submittedAt: now,
        verifiedAt: null,
        revokedAt: null,
        reviewHistory: [{ action: 'submitted', reasonCode: null, reason: null, actorId: userId, actedAt: now }],
    });
    await ownership.save(session ? { session } : undefined);
    return ownership;
};

const throwOwnershipCreateConflict = (error: unknown): never => {
    if ((error as { code?: number })?.code === 11000) {
        throw new ApiError(409, 'DUPLICATE_ACTIVE_OWNERSHIP', 'Yêu cầu ownership bị trùng hoặc xung đột.');
    }
    throw error;
};

export const createOwnership = async (rawInput: unknown, actor: Actor) => {
    await assertApplicant(actor);
    const input = parseWith(createOwnershipSchema, rawInput);
    try {
        if (input.locationMode === 'existing') {
            assertObjectId(input.locationId, 'LOCATION_NOT_CLAIMABLE');
            const location = await Location.findById(input.locationId)
                .select({ status: 1, isDeleted: 1 })
                .lean();
            if (!isLocationPublicValid(location)) {
                throw new ApiError(409, 'LOCATION_NOT_CLAIMABLE', 'Địa điểm không còn ở trạng thái công khai hợp lệ.');
            }
            const ownership = await createOwnershipDocument(
                actor.id,
                input.locationId,
                'existing',
                input.claim,
            );
            return getMyOwnership(ownership._id.toString(), actor);
        }

        const session = await mongoose.startSession();
        let ownershipId = '';
        try {
            await session.withTransaction(async () => {
                const location = await createLocation(input.location, actor, { session });
                ownershipId = (location as { id: string }).id;
                const ownership = await createOwnershipDocument(
                    actor.id,
                    ownershipId,
                    'new',
                    input.claim,
                    session,
                );
                ownershipId = ownership._id.toString();
            });
        } finally {
            await session.endSession();
        }
        if (!ownershipId) throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Không thể hoàn tất hồ sơ ownership.');
        return getMyOwnership(ownershipId, actor);
    } catch (error) {
        return throwOwnershipCreateConflict(error);
    }
};

export const getBusinessSummary = async (actor: Actor) => {
    const counts = await LocationOwnership.aggregate<{ _id: LocationOwnershipStatus; count: number }>([
        { $match: { userId: new mongoose.Types.ObjectId(actor.id) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = new Map(counts.map((entry) => [entry._id, entry.count]));
    const verifiedCount = byStatus.get('verified') ?? 0;
    const pendingCount = byStatus.get('pending') ?? 0;
    const rejectedCount = byStatus.get('rejected') ?? 0;
    return {
        verifiedCount,
        pendingCount,
        rejectedCount,
        menuState: verifiedCount > 0 ? 'active_owner' : pendingCount + rejectedCount > 0 ? 'has_requests' : 'none',
    };
};

export const getMyOwnerships = async (actor: Actor, query: OwnershipQuery = {}) => {
    const filter: Record<string, unknown> = { userId: actor.id };
    if (query.status) {
        if (!['pending', 'verified', 'rejected', 'revoked', 'cancelled'].includes(query.status)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái ownership không hợp lệ.');
        }
        filter.status = query.status;
    }
    const page = parsePage(query.page, 1);
    const pageSize = parsePage(query.pageSize, 20, 50);
    const [items, total] = await Promise.all([
        LocationOwnership.find(filter)
            .populate('locationId', 'name status isDeleted address images')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        LocationOwnership.countDocuments(filter),
    ]);
    return {
        data: items.map((item) => ownershipDto(item, false)),
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
};

export const getMyOwnership = async (ownershipId: string, actor: Actor) => {
    assertObjectId(ownershipId, 'OWNERSHIP_NOT_FOUND');
    const ownership = await LocationOwnership.findOne({ _id: ownershipId, userId: actor.id })
        .populate('locationId', 'name status isDeleted address images')
        .lean();
    if (!ownership) throw new ApiError(404, 'OWNERSHIP_NOT_FOUND', 'Không tìm thấy yêu cầu ownership.');
    return ownershipDto(ownership);
};

export const updateMyOwnership = async (ownershipId: string, rawInput: unknown, actor: Actor) => {
    assertObjectId(ownershipId, 'OWNERSHIP_NOT_FOUND');
    const input = parseWith(updateOwnershipSchema, rawInput);
    const ownership = await LocationOwnership.findOne({ _id: ownershipId, userId: actor.id });
    if (!ownership) throw new ApiError(404, 'OWNERSHIP_NOT_FOUND', 'Không tìm thấy yêu cầu ownership.');
    if (ownership.status !== 'rejected') {
        throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Chỉ yêu cầu bị từ chối mới được bổ sung.');
    }
    if (input.relationship !== undefined) ownership.relationship = input.relationship;
    if (input.contactName !== undefined) ownership.contactName = input.contactName;
    if (input.contactPhone !== undefined) ownership.contactPhone = input.contactPhone;
    if (input.contactEmail !== undefined) ownership.contactEmail = input.contactEmail?.toLowerCase() ?? null;
    if (input.note !== undefined) ownership.note = input.note;
    if (input.evidenceAssetTokens !== undefined) {
        ownership.evidenceImages = evidenceFromTokens(input.evidenceAssetTokens, actor.id) as never;
    }
    if (!ownership.contactPhone && !ownership.contactEmail) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Cần cung cấp ít nhất số điện thoại hoặc email liên hệ.');
    }
    await ownership.save();
    return getMyOwnership(ownershipId, actor);
};

export const resubmitMyOwnership = async (ownershipId: string, actor: Actor) => {
    assertObjectId(ownershipId, 'OWNERSHIP_NOT_FOUND');
    const ownership = await LocationOwnership.findOne({ _id: ownershipId, userId: actor.id });
    if (!ownership) throw new ApiError(404, 'OWNERSHIP_NOT_FOUND', 'Không tìm thấy yêu cầu ownership.');
    if (ownership.status !== 'rejected') {
        throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Yêu cầu không ở trạng thái có thể gửi lại.');
    }
    const location = await Location.findById(ownership.locationId).select({ status: 1, isDeleted: 1 }).lean();
    if (ownership.locationMode === 'existing' && !isLocationPublicValid(location)) {
        throw new ApiError(409, 'LOCATION_NOT_CLAIMABLE', 'Địa điểm không còn đủ điều kiện để gửi lại.');
    }
    const now = new Date();
    ownership.status = 'pending';
    ownership.submittedAt = now;
    ownership.activeKey = ownershipActiveKey(actor.id, ownership.locationId.toString());
    ownership.reviewHistory.push({
        action: 'resubmitted', reasonCode: null, reason: null,
        actorId: new mongoose.Types.ObjectId(actor.id), actedAt: now,
    });
    await ownership.save();
    return getMyOwnership(ownershipId, actor);
};

export const cancelMyOwnership = async (ownershipId: string, actor: Actor) => {
    assertObjectId(ownershipId, 'OWNERSHIP_NOT_FOUND');
    const now = new Date();
    const ownership = await LocationOwnership.findOneAndUpdate(
        { _id: ownershipId, userId: actor.id, status: 'pending' },
        {
            $set: { status: 'cancelled', activeKey: null },
            $push: { reviewHistory: { action: 'cancelled', reasonCode: null, reason: null, actorId: actor.id, actedAt: now } },
        },
        { new: true },
    );
    if (!ownership) throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Yêu cầu không thể hủy ở trạng thái hiện tại.');
    return getMyOwnership(ownershipId, actor);
};

export const getAdminOwnerships = async (query: OwnershipQuery = {}) => {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.locationMode) filter.locationMode = query.locationMode;
    const page = parsePage(query.page, 1);
    const pageSize = parsePage(query.pageSize, 20, 100);
    const [items, total] = await Promise.all([
        LocationOwnership.find(filter)
            .populate('locationId', 'name status isDeleted address images')
            .populate('userId', 'displayName email status')
            .sort(query.status === 'pending' ? { submittedAt: 1 } : { updatedAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        LocationOwnership.countDocuments(filter),
    ]);
    return {
        data: items.map((item) => ownershipDto(item, false)),
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
};

export const getAdminOwnership = async (ownershipId: string) => {
    assertObjectId(ownershipId, 'OWNERSHIP_NOT_FOUND');
    const ownership = await LocationOwnership.findById(ownershipId)
        .populate('locationId', 'name status isDeleted address images createdBy moderation')
        .populate('userId', 'displayName email status role')
        .lean();
    if (!ownership) throw new ApiError(404, 'OWNERSHIP_NOT_FOUND', 'Không tìm thấy yêu cầu ownership.');
    const otherClaims = await LocationOwnership.find({
        locationId: (ownership.locationId as any)._id,
        _id: { $ne: ownership._id },
        status: { $in: ['pending', 'verified'] },
    }).select({ userId: 1, status: 1, submittedAt: 1 }).lean();
    return { ...ownershipDto(ownership), conflicts: otherClaims };
};

const reviewOwnership = async (
    ownershipId: string,
    actor: Actor,
    action: 'approved' | 'rejected' | 'revoked',
    rawInput?: unknown,
) => {
    assertObjectId(ownershipId, 'OWNERSHIP_NOT_FOUND');
    const review = action === 'approved'
        ? { reasonCode: null, reason: null }
        : parseWith(ownershipReviewSchema, rawInput);
    const expectedStatus = action === 'revoked' ? 'verified' : 'pending';
    const nextStatus = action === 'approved' ? 'verified' : action;
    const session = await mongoose.startSession();
    try {
        let result: ILocationOwnership | null = null;
        await session.withTransaction(async () => {
            const ownership = await LocationOwnership.findOne({ _id: ownershipId, status: expectedStatus })
                .session(session);
            if (!ownership) {
                const exists = await LocationOwnership.exists({ _id: ownershipId }).session(session);
                if (!exists) throw new ApiError(404, 'OWNERSHIP_NOT_FOUND', 'Không tìm thấy yêu cầu ownership.');
                throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Yêu cầu đã được xử lý bởi thao tác khác.');
            }
            if (ownership.userId.toString() === actor.id) {
                throw new ApiError(403, 'FORBIDDEN', 'Admin không thể tự xử lý hồ sơ của mình.');
            }
            if (action === 'approved') {
                const [location, applicant, otherOwner] = await Promise.all([
                    Location.findById(ownership.locationId).select({ status: 1, isDeleted: 1 }).session(session).lean(),
                    User.findById(ownership.userId).select({ role: 1, status: 1 }).session(session).lean(),
                    LocationOwnership.exists({
                        locationId: ownership.locationId,
                        status: 'verified',
                        _id: { $ne: ownership._id },
                    }).session(session),
                ]);
                if (!isLocationPublicValid(location)) {
                    throw new ApiError(409, 'LOCATION_NOT_APPROVED', 'Location phải được duyệt và công khai trước ownership.');
                }
                if (!applicant || applicant.status !== 'active' || applicant.role !== 'user') {
                    throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Applicant không còn đủ điều kiện.');
                }
                if (otherOwner) {
                    throw new ApiError(409, 'LOCATION_ALREADY_HAS_VERIFIED_OWNER', 'Location đã có owner được xác minh.');
                }
            }
            const now = new Date();
            ownership.status = nextStatus;
            ownership.verifiedAt = action === 'approved' ? now : ownership.verifiedAt;
            ownership.revokedAt = action === 'revoked' ? now : ownership.revokedAt;
            ownership.activeKey = action === 'revoked' ? null : ownership.activeKey;
            ownership.reviewHistory.push({
                action,
                reasonCode: review.reasonCode,
                reason: review.reason,
                actorId: new mongoose.Types.ObjectId(actor.id),
                actedAt: now,
            });
            await ownership.save({ session });
            result = ownership;
        });
        if (!result) throw new ApiError(409, 'OWNERSHIP_STATE_CONFLICT', 'Không thể cập nhật ownership.');
        return getAdminOwnership((result as ILocationOwnership)._id.toString());
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) {
            throw new ApiError(409, 'LOCATION_ALREADY_HAS_VERIFIED_OWNER', 'Location đã có owner được xác minh.');
        }
        throw error;
    } finally {
        await session.endSession();
    }
};

export const approveOwnership = (ownershipId: string, actor: Actor) => (
    reviewOwnership(ownershipId, actor, 'approved')
);
export const rejectOwnership = (ownershipId: string, input: unknown, actor: Actor) => (
    reviewOwnership(ownershipId, actor, 'rejected', input)
);
export const revokeOwnership = (ownershipId: string, input: unknown, actor: Actor) => (
    reviewOwnership(ownershipId, actor, 'revoked', input)
);

export const requireVerifiedOwnership = async (userId: string, locationId: string) => {
    assertObjectId(locationId, 'LOCATION_NOT_CLAIMABLE');
    const [ownership, location] = await Promise.all([
        LocationOwnership.findOne({ userId, locationId, status: 'verified' }),
        Location.findById(locationId).select({ status: 1, isDeleted: 1 }).lean(),
    ]);
    if (!ownership) {
        throw new ApiError(403, 'FORBIDDEN', 'Cần ownership đã xác minh cho Location này.');
    }
    if (!isLocationPublicValid(location)) {
        throw new ApiError(409, 'LOCATION_NOT_CLAIMABLE', 'Location hiện không ở trạng thái public-valid.');
    }
    return ownership;
};

export const getBusinessLocations = async (actor: Actor) => {
    const ownerships = await LocationOwnership.find({ userId: actor.id, status: 'verified' })
        .populate('locationId', 'name status isDeleted address images')
        .sort({ verifiedAt: -1 })
        .lean();
    return ownerships.map((ownership) => ownershipDto(ownership, false));
};

export const getLocationOwnershipContext = async (locationId: string, userId?: string) => {
    assertObjectId(locationId, 'LOCATION_NOT_CLAIMABLE');
    const location = await Location.findById(locationId).select({ status: 1, isDeleted: 1 }).lean();
    if (!isLocationPublicValid(location)) {
        throw new ApiError(404, 'LOCATION_NOT_CLAIMABLE', 'Địa điểm không công khai.');
    }
    const [verified, mine] = await Promise.all([
        LocationOwnership.findOne({ locationId, status: 'verified' }).select({ _id: 1, userId: 1 }).lean(),
        userId
            ? LocationOwnership.findOne({
                locationId,
                userId,
                status: { $in: ['pending', 'verified', 'rejected'] },
            }).select({ _id: 1, status: 1 }).lean()
            : Promise.resolve(null),
    ]);
    return {
        claimable: !verified,
        hasVerifiedOwner: Boolean(verified),
        myOwnership: mine ? { id: mine._id.toString(), status: mine.status } : null,
    };
};
