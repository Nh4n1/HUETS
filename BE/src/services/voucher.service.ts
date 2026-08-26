import mongoose from 'mongoose';
import { ZodError } from 'zod';
import Location from '../models/location.model.ts';
import LocationOwnership from '../models/locationOwnership.model.ts';
import Voucher from '../models/voucher.model.ts';
import type { IVoucher, VoucherStatus } from '../models/voucher.model.ts';
import VoucherClaim from '../models/voucherClaim.model.ts';
import { voucherInputSchema, voucherPatchSchema } from '../schemas/voucher.schema.ts';
import { isLocationPublicValid, requireVerifiedOwnership } from './locationOwnership.service.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor { id: string; role: 'user' | 'mod' | 'admin' }
export interface VoucherQuery { status?: string; page?: string; pageSize?: string }
export interface PublicVoucherQuery { page?: string; pageSize?: string; sortBy?: string; categoryCode?: string }

export const getPublicVoucherSort = (sortBy: 'newest' | 'ending_soon') => sortBy === 'ending_soon'
    ? { claimEndAt: 1 as const, claimedCount: -1 as const, createdAt: -1 as const, _id: 1 as const }
    : { createdAt: -1 as const, _id: 1 as const };

export const diversifyVouchersByLocation = <T extends { locationId: unknown }>(items: T[], limit: number) => {
    const selected: T[] = [];
    const selectedItems = new Set<T>();
    const seenLocations = new Set<string>();
    for (const item of items) {
        const locationId = String(item.locationId);
        if (seenLocations.has(locationId)) continue;
        selected.push(item);
        selectedItems.add(item);
        seenLocations.add(locationId);
        if (selected.length === limit) return selected;
    }
    for (const item of items) {
        if (selectedItems.has(item)) continue;
        selected.push(item);
        if (selected.length === limit) break;
    }
    return selected;
};

const objectId = (id: string, message = 'Không tìm thấy Voucher.') => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'NOT_FOUND', message);
};

const parse = <T>(schema: { parse(value: unknown): T }, value: unknown): T => {
    try { return schema.parse(value); }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ApiError(422, 'VALIDATION_ERROR', error.issues[0]?.message ?? 'Dữ liệu Voucher không hợp lệ.', { issues: error.issues });
        }
        throw error;
    }
};

const pageValue = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    const result = Number(value);
    if (!Number.isInteger(result) || result < 1) throw new ApiError(400, 'VALIDATION_ERROR', 'Phân trang không hợp lệ.');
    return maximum ? Math.min(result, maximum) : result;
};

export const isVoucherInClaimWindow = (voucher: Pick<IVoucher, 'claimStartAt' | 'claimEndAt'>, now = new Date()) => (
    voucher.claimStartAt <= now && now <= voucher.claimEndAt
);

export const isVoucherClaimable = (
    voucher: Pick<IVoucher, 'status' | 'claimStartAt' | 'claimEndAt' | 'claimedCount' | 'totalQuantity'>,
    location: { status?: unknown; isDeleted?: unknown } | null,
    ownership: { status?: unknown } | null,
    now = new Date(),
) => voucher.status === 'active'
    && isVoucherInClaimWindow(voucher as Pick<IVoucher, 'claimStartAt' | 'claimEndAt'>, now)
    && voucher.claimedCount < voucher.totalQuantity
    && isLocationPublicValid(location)
    && ownership?.status === 'verified';

const benefitDto = (benefit: any) => ({
    type: benefit.type,
    value: benefit.value,
    maxDiscountAmount: benefit.maxDiscountAmount ?? null,
    minOrderAmount: benefit.minOrderAmount ?? null,
    currency: 'VND',
});

const voucherDto = (voucher: any, context?: { location?: any; ownership?: any; now?: Date }) => {
    const location = context?.location ?? voucher.locationId;
    const ownership = context?.ownership ?? voucher.issuedByOwnershipId;
    const claimable = location && ownership
        ? isVoucherClaimable(voucher, location, ownership, context?.now)
        : undefined;
    return {
        id: voucher._id.toString(),
        locationId: voucher.locationId?._id?.toString?.() ?? voucher.locationId.toString(),
        ...(context ? {} : { issuedByOwnershipId: voucher.issuedByOwnershipId?._id?.toString?.() ?? voucher.issuedByOwnershipId.toString() }),
        title: voucher.title,
        description: voucher.description,
        benefit: benefitDto(voucher.benefit),
        terms: voucher.terms,
        claimStartAt: voucher.claimStartAt,
        claimEndAt: voucher.claimEndAt,
        redeemUntil: voucher.redeemUntil,
        totalQuantity: voucher.totalQuantity,
        claimedCount: voucher.claimedCount,
        redeemedCount: voucher.redeemedCount,
        remainingQuantity: Math.max(0, voucher.totalQuantity - voucher.claimedCount),
        status: voucher.status,
        publishedAt: voucher.publishedAt,
        endedAt: voucher.endedAt,
        ...(claimable === undefined ? {} : { claimable }),
        location: location?._id ? {
            id: location._id.toString(), name: location.name,
            formattedAddress: [location.address?.addressLine, location.address?.wardNameSnapshot, 'Thành phố Huế'].filter(Boolean).join(', '),
            coverImageUrl: [...(location.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
            categoryCode: location.categoryCode,
        } : undefined,
        createdAt: voucher.createdAt,
        updatedAt: voucher.updatedAt,
    };
};

const claimDisplayStatus = (claim: any, context?: { location?: any; ownership?: any }) => {
    if (claim.status === 'used') return 'used';
    if (new Date() > new Date(claim.redeemUntil)) return 'expired';
    if (context && (!isLocationPublicValid(context.location) || context.ownership?.status !== 'verified')) return 'unavailable';
    return 'available';
};

const viewerClaimDto = (claim: any, context?: { location?: any; ownership?: any }) => {
    const displayStatus = claimDisplayStatus(claim, context);
    return {
        id: claim._id.toString(),
        status: claim.status,
        displayStatus,
        redeemable: displayStatus === 'available',
        redeemUntil: claim.redeemUntil,
    };
};

const attachViewerClaims = async (vouchers: any[], currentUserId?: string) => {
    if (!currentUserId || vouchers.length === 0) {
        return vouchers.map((voucher) => ({ ...voucher, viewerClaim: null }));
    }
    const claims = await VoucherClaim.find({
        userId: currentUserId,
        voucherId: { $in: vouchers.map((voucher) => voucher.id) },
    }).lean();
    const claimsByVoucher = new Map(claims.map((claim) => [claim.voucherId.toString(), claim]));
    return vouchers.map((voucher) => ({
        ...voucher,
        viewerClaim: claimsByVoucher.has(voucher.id) ? viewerClaimDto(claimsByVoucher.get(voucher.id)) : null,
    }));
};

const ownerVoucher = async (actor: Actor, locationId: string, voucherId: string) => {
    objectId(locationId, 'Không tìm thấy Location.');
    objectId(voucherId);
    const ownership = await requireVerifiedOwnership(actor.id, locationId);
    const voucher = await Voucher.findOne({
        _id: voucherId,
        locationId,
        issuedByOwnershipId: ownership._id,
    });
    if (!voucher) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Voucher thuộc ownership hiện tại.');
    return { voucher, ownership };
};

export const createVoucher = async (locationId: string, rawInput: unknown, actor: Actor) => {
    objectId(locationId, 'Không tìm thấy Location.');
    const ownership = await requireVerifiedOwnership(actor.id, locationId);
    const input = parse(voucherInputSchema, rawInput);
    const voucher = await Voucher.create({
        locationId,
        issuedByOwnershipId: ownership._id,
        createdByUserId: actor.id,
        ...input,
        benefit: { ...input.benefit, currency: 'VND' },
        status: 'draft',
        claimedCount: 0,
        redeemedCount: 0,
        publishedAt: null,
        endedAt: null,
    });
    return voucherDto(voucher);
};

export const getOwnerVouchers = async (locationId: string, actor: Actor, query: VoucherQuery = {}) => {
    const ownership = await requireVerifiedOwnership(actor.id, locationId);
    const filter: Record<string, unknown> = { locationId, issuedByOwnershipId: ownership._id };
    if (query.status) {
        if (!['draft', 'active', 'paused', 'ended'].includes(query.status)) throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái Voucher không hợp lệ.');
        filter.status = query.status;
    }
    const page = pageValue(query.page, 1);
    const pageSize = pageValue(query.pageSize, 20, 100);
    const [items, total] = await Promise.all([
        Voucher.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Voucher.countDocuments(filter),
    ]);
    return { data: items.map((item) => voucherDto(item)), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

export const getOwnerVoucher = async (locationId: string, voucherId: string, actor: Actor) => {
    const { voucher } = await ownerVoucher(actor, locationId, voucherId);
    return voucherDto(voucher);
};

export const updateVoucher = async (locationId: string, voucherId: string, rawInput: unknown, actor: Actor) => {
    const { voucher } = await ownerVoucher(actor, locationId, voucherId);
    if (voucher.status === 'ended') throw new ApiError(409, 'VOUCHER_STATE_CONFLICT', 'Voucher đã kết thúc và chỉ có thể xem.');
    const patch = parse(voucherPatchSchema, rawInput);
    if (voucher.claimedCount > 0 && ['benefit', 'terms', 'claimStartAt', 'claimEndAt', 'redeemUntil', 'totalQuantity'].some((field) => field in patch)) {
        throw new ApiError(409, 'VOUCHER_BENEFIT_LOCKED', 'Không thể thay đổi quyền lợi hoặc thời hạn sau khi đã có User nhận Voucher.');
    }
    const merged = parse(voucherInputSchema, {
        title: patch.title ?? voucher.title,
        description: patch.description ?? voucher.description,
        benefit: patch.benefit ?? benefitDto(voucher.benefit),
        terms: patch.terms ?? voucher.terms,
        claimStartAt: patch.claimStartAt ?? voucher.claimStartAt,
        claimEndAt: patch.claimEndAt ?? voucher.claimEndAt,
        redeemUntil: patch.redeemUntil ?? voucher.redeemUntil,
        totalQuantity: patch.totalQuantity ?? voucher.totalQuantity,
    });
    voucher.set({ ...merged, benefit: { ...merged.benefit, currency: 'VND' } });
    await voucher.save();
    return voucherDto(voucher);
};

export const deleteVoucher = async (locationId: string, voucherId: string, actor: Actor) => {
    const { voucher } = await ownerVoucher(actor, locationId, voucherId);
    if (voucher.status !== 'draft' || voucher.claimedCount > 0) {
        throw new ApiError(409, 'VOUCHER_STATE_CONFLICT', 'Chỉ Voucher draft chưa có claim mới được xóa.');
    }
    await voucher.deleteOne();
    return { deleted: true };
};

const transitionVoucher = async (
    locationId: string,
    voucherId: string,
    actor: Actor,
    action: 'publish' | 'pause' | 'resume' | 'end',
) => {
    const { voucher } = await ownerVoucher(actor, locationId, voucherId);
    const transitions: Record<typeof action, { from: VoucherStatus[]; to: VoucherStatus }> = {
        publish: { from: ['draft'], to: 'active' },
        pause: { from: ['active'], to: 'paused' },
        resume: { from: ['paused'], to: 'active' },
        end: { from: ['active', 'paused'], to: 'ended' },
    };
    const transition = transitions[action];
    if (!transition.from.includes(voucher.status)) {
        throw new ApiError(409, 'VOUCHER_STATE_CONFLICT', `Không thể ${action} Voucher ở trạng thái ${voucher.status}.`);
    }
    if (action === 'publish' && voucher.redeemUntil <= new Date()) {
        throw new ApiError(409, 'VOUCHER_STATE_CONFLICT', 'Không thể publish Voucher đã hết hạn sử dụng.');
    }
    const now = new Date();
    voucher.status = transition.to;
    if (action === 'publish') voucher.publishedAt = now;
    if (action === 'end') voucher.endedAt = now;
    await voucher.save();
    return voucherDto(voucher);
};

export const publishVoucher = (locationId: string, voucherId: string, actor: Actor) => transitionVoucher(locationId, voucherId, actor, 'publish');
export const pauseVoucher = (locationId: string, voucherId: string, actor: Actor) => transitionVoucher(locationId, voucherId, actor, 'pause');
export const resumeVoucher = (locationId: string, voucherId: string, actor: Actor) => transitionVoucher(locationId, voucherId, actor, 'resume');
export const endVoucher = (locationId: string, voucherId: string, actor: Actor) => transitionVoucher(locationId, voucherId, actor, 'end');

const publicPageValue = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || (maximum !== undefined && parsed > maximum)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'ThÃ´ng tin phÃ¢n trang Voucher khÃ´ng há»£p lá»‡.');
    }
    return parsed;
};

export const listPublicVouchers = async (query: PublicVoucherQuery = {}, currentUserId?: string) => {
    const page = publicPageValue(query.page, 1);
    const pageSize = publicPageValue(query.pageSize, 12, 24);
    const sortBy = query.sortBy ?? 'newest';
    if (!['newest', 'ending_soon'].includes(sortBy)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'CÃ¡ch sáº¯p xáº¿p Voucher khÃ´ng há»£p lá»‡.');
    }
    const categoryCode = query.categoryCode?.trim().toLowerCase();
    if (categoryCode && !/^[a-z0-9_]+$/.test(categoryCode)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Category Voucher khÃ´ng há»£p lá»‡.');
    }

    const now = new Date();
    const sort = getPublicVoucherSort(sortBy as 'newest' | 'ending_soon');
    const isExplorePreview = page === 1 && pageSize <= 4 && sortBy === 'ending_soon' && !categoryCode;
    const candidateLimit = Math.min(pageSize * 5, 40);
    const locationMatch: Record<string, unknown> = { status: 'approved', isDeleted: { $ne: true } };
    if (categoryCode) locationMatch.categoryCode = categoryCode;

    const result = await Voucher.aggregate([
        { $match: {
            status: 'active',
            claimStartAt: { $lte: now },
            claimEndAt: { $gte: now },
            $expr: { $lt: ['$claimedCount', '$totalQuantity'] },
        } },
        { $lookup: { from: 'locations', localField: 'locationId', foreignField: '_id', as: 'location' } },
        { $unwind: '$location' },
        { $match: Object.fromEntries(Object.entries(locationMatch).map(([key, value]) => [`location.${key}`, value])) },
        { $lookup: { from: 'location_ownerships', localField: 'issuedByOwnershipId', foreignField: '_id', as: 'ownership' } },
        { $unwind: '$ownership' },
        { $match: { 'ownership.status': 'verified' } },
        { $sort: sort as any },
        { $facet: {
            data: isExplorePreview
                ? [{ $limit: candidateLimit }]
                : [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
            total: [{ $count: 'value' }],
        } },
    ]);
    const candidates = result[0]?.data ?? [];
    const selected = isExplorePreview ? diversifyVouchersByLocation(candidates, pageSize) : candidates;
    const vouchers = selected.map((voucher: any) => voucherDto(voucher, {
        location: voucher.location,
        ownership: voucher.ownership,
        now,
    }));
    const data = await attachViewerClaims(vouchers, currentUserId);
    const total = result[0]?.total?.[0]?.value ?? 0;
    return { data, meta: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) } };
};

export const getPublicLocationVouchers = async (locationId: string, currentUserId?: string) => {
    objectId(locationId, 'Không tìm thấy Location.');
    const now = new Date();
    const viewerClaims = currentUserId
        ? await VoucherClaim.find({ userId: currentUserId, locationId }).select({ voucherId: 1 }).lean()
        : [];
    const viewerVoucherIds = viewerClaims.map((claim) => claim.voucherId);
    const voucherFilter: Record<string, unknown> = {
        locationId,
        $or: [
            { status: 'active', claimStartAt: { $lte: now }, claimEndAt: { $gte: now }, $expr: { $lt: ['$claimedCount', '$totalQuantity'] } },
            ...(viewerVoucherIds.length ? [{ _id: { $in: viewerVoucherIds }, status: { $in: ['active', 'paused'] } }] : []),
        ],
    };
    const [location, vouchers] = await Promise.all([
        Location.findById(locationId).select({ status: 1, isDeleted: 1, name: 1, address: 1, images: 1, categoryCode: 1 }).lean(),
        Voucher.find(voucherFilter).sort({ claimEndAt: 1 }).lean(),
    ]);
    if (!isLocationPublicValid(location)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Location công khai.');
    const ownershipIds = [...new Set(vouchers.map((voucher) => voucher.issuedByOwnershipId.toString()))];
    const activeOwnerships = await LocationOwnership.find({ _id: { $in: ownershipIds }, status: 'verified' }).select({ _id: 1, status: 1 }).lean();
    const active = new Set(activeOwnerships.map((ownership) => ownership._id.toString()));
    const data = vouchers.filter((voucher) => active.has(voucher.issuedByOwnershipId.toString())).map((voucher) => voucherDto(voucher, { location, ownership: { status: 'verified' }, now }));
    return attachViewerClaims(data, currentUserId);
};

export const getPublicVoucher = async (voucherId: string, currentUserId?: string) => {
    objectId(voucherId);
    const voucher = await Voucher.findById(voucherId)
        .populate('locationId', 'name status isDeleted address images categoryCode')
        .populate('issuedByOwnershipId', 'status')
        .lean();
    if (!voucher || !['active', 'paused'].includes(voucher.status)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Voucher công khai.');
    const location = voucher.locationId as any;
    const ownership = voucher.issuedByOwnershipId as any;
    if (!isLocationPublicValid(location) || ownership.status !== 'verified') throw new ApiError(404, 'NOT_FOUND', 'Voucher hiện không khả dụng.');
    const [result] = await attachViewerClaims([voucherDto(voucher, { location, ownership })], currentUserId);
    return result;
};

export const claimVoucher = async (voucherId: string, actor: Actor) => {
    objectId(voucherId);
    const session = await mongoose.startSession();
    let claimId = '';
    try {
        await session.withTransaction(async () => {
            const voucher = await Voucher.findById(voucherId).session(session);
            if (!voucher) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Voucher.');
            const [location, ownership, previousClaim] = await Promise.all([
                Location.findById(voucher.locationId).select({ status: 1, isDeleted: 1, name: 1, address: 1, images: 1 }).session(session).lean(),
                LocationOwnership.findById(voucher.issuedByOwnershipId).select({ status: 1, userId: 1 }).session(session).lean(),
                VoucherClaim.exists({ voucherId, userId: actor.id }).session(session),
            ]);
            if (previousClaim) throw new ApiError(409, 'VOUCHER_ALREADY_CLAIMED', 'Bạn đã nhận Voucher này.');
            if (ownership?.userId.toString() === actor.id) throw new ApiError(403, 'OWNER_CANNOT_CLAIM_OWN_VOUCHER', 'Owner không thể nhận Voucher do ownership của mình phát hành.');
            if (!isVoucherClaimable(voucher, location, ownership)) {
                if (voucher.claimedCount >= voucher.totalQuantity) throw new ApiError(409, 'VOUCHER_SOLD_OUT', 'Voucher đã hết suất.');
                throw new ApiError(409, 'VOUCHER_NOT_CLAIMABLE', 'Voucher hiện không thể nhận.');
            }
            const updated = await Voucher.updateOne(
                { _id: voucherId, status: 'active', claimedCount: { $lt: voucher.totalQuantity } },
                { $inc: { claimedCount: 1 } },
                { session },
            );
            if (updated.modifiedCount !== 1) throw new ApiError(409, 'VOUCHER_SOLD_OUT', 'Voucher vừa hết suất.');
            const now = new Date();
            const claim = new VoucherClaim({
                voucherId: voucher._id,
                userId: actor.id,
                locationId: voucher.locationId,
                issuedByOwnershipId: voucher.issuedByOwnershipId,
                status: 'available',
                claimedAt: now,
                redeemUntil: voucher.redeemUntil,
                benefitSnapshot: benefitDto(voucher.benefit),
                termsSnapshot: voucher.terms,
                voucherTitleSnapshot: voucher.title,
                voucherDescriptionSnapshot: voucher.description,
                locationSnapshot: {
                    name: location?.name ?? 'Location',
                    formattedAddress: [location?.address?.addressLine, location?.address?.wardNameSnapshot, 'Thành phố Huế'].filter(Boolean).join(', '),
                    coverImageUrl: [...(location?.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
                },
                usedAt: null,
                redemptionId: null,
            });
            await claim.save({ session });
            claimId = claim._id.toString();
        });
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) throw new ApiError(409, 'VOUCHER_ALREADY_CLAIMED', 'Bạn đã nhận Voucher này.');
        throw error;
    } finally { await session.endSession(); }
    return getMyVoucherClaim(claimId, actor);
};

const claimDto = (claim: any, context?: { location?: any; ownership?: any }) => {
    const displayStatus = claimDisplayStatus(claim, context);
    return {
        id: claim._id.toString(), voucherId: claim.voucherId.toString(), locationId: claim.locationId.toString(),
        status: claim.status, displayStatus,
        isRedeemable: displayStatus === 'available',
        claimedAt: claim.claimedAt, redeemUntil: claim.redeemUntil,
        benefit: claim.benefitSnapshot, terms: claim.termsSnapshot,
        title: claim.voucherTitleSnapshot, description: claim.voucherDescriptionSnapshot,
        location: claim.locationSnapshot, usedAt: claim.usedAt,
    };
};

export const getMyVoucherClaims = async (actor: Actor) => {
    const claims = await VoucherClaim.find({ userId: actor.id }).sort({ redeemUntil: 1, createdAt: -1 }).lean();
    const locationIds = [...new Set(claims.map((claim) => claim.locationId.toString()))];
    const ownershipIds = [...new Set(claims.map((claim) => claim.issuedByOwnershipId.toString()))];
    const [locations, ownerships] = await Promise.all([
        Location.find({ _id: { $in: locationIds } }).select({ status: 1, isDeleted: 1 }).lean(),
        LocationOwnership.find({ _id: { $in: ownershipIds } }).select({ status: 1 }).lean(),
    ]);
    const locationMap = new Map(locations.map((item) => [item._id.toString(), item]));
    const ownershipMap = new Map(ownerships.map((item) => [item._id.toString(), item]));
    return claims.map((claim) => claimDto(claim, { location: locationMap.get(claim.locationId.toString()), ownership: ownershipMap.get(claim.issuedByOwnershipId.toString()) }));
};

export const getMyVoucherClaim = async (claimId: string, actor: Actor) => {
    objectId(claimId, 'Không tìm thấy VoucherClaim.');
    const claim = await VoucherClaim.findOne({ _id: claimId, userId: actor.id }).lean();
    if (!claim) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy VoucherClaim.');
    const [location, ownership] = await Promise.all([
        Location.findById(claim.locationId).select({ status: 1, isDeleted: 1 }).lean(),
        LocationOwnership.findById(claim.issuedByOwnershipId).select({ status: 1 }).lean(),
    ]);
    return claimDto(claim, { location, ownership });
};
