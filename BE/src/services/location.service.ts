import mongoose from 'mongoose';
import { verifyLocationImageAssetToken } from '../helpers/locationAssetToken.helper.ts';
import { normalizeSearchText } from '../helpers/text.helper.ts';
import Category from '../models/category.model.ts';
import Bookmark from '../models/bookmark.model.ts';
import Location from '../models/location.model.ts';
import Notification from '../models/notification.model.ts';
import type {
    ILocation,
    ILocationEditSnapshot,
    ILocationOpeningHours,
    IOpeningPeriod,
    IOpeningRange,
    LocationStatus,
} from '../models/location.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import User from '../models/user.model.ts';
import { getWardByCode } from './reference.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { safeCreateLocationNotification } from './notification.service.ts';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const DUPLICATE_RADIUS_METERS = 150;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const RECOMMENDED_LOCATION_SORT: Record<string, 1 | -1> = {
    'ratingSummary.average': -1,
    'ratingSummary.count': -1,
    createdAt: -1,
    _id: -1,
};

const RATING_DESC_LOCATION_SORT: Record<string, 1 | -1> = {
    'ratingSummary.average': -1,
    'ratingSummary.count': -1,
    _id: -1,
};

const NEWEST_LOCATION_SORT: Record<string, 1 | -1> = {
    'moderation.reviewedAt': -1,
    createdAt: -1,
    _id: -1,
};

interface Actor {
    id: string;
    role: 'user' | 'mod' | 'admin';
}

interface OpeningRangeInput {
    open?: unknown;
    close?: unknown;
}

interface OpeningPeriodInput {
    dayOfWeek?: unknown;
    ranges?: unknown;
}

interface OpeningHoursInput {
    status?: unknown;
    periods?: unknown;
}

interface ImageInput {
    assetToken?: unknown;
    existingImageId?: unknown;
    position?: unknown;
}

export interface CreateLocationInput {
    name?: unknown;
    description?: unknown;
    categoryCode?: unknown;
    tagCodes?: unknown;
    aliases?: unknown;
    wardCode?: unknown;
    addressLine?: unknown;
    locationNote?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    openingHours?: unknown;
    images?: unknown;
}

export type PublicLocationSortBy = 'recommended' | 'rating_desc' | 'newest';

export interface PublicLocationQuery {
    page?: string;
    pageSize?: string;
    q?: string;
    categoryCode?: string;
    wardCode?: string;
    tagCodes?: string;
    sortBy?: PublicLocationSortBy;
}

export interface AdminLocationQuery extends PublicLocationQuery {
    status?: string;
}

export interface MyLocationQuery {
    page?: string;
    pageSize?: string;
    status?: string;
}

export interface ModerateLocationInput {
    expectedStatus?: unknown;
    expectedUpdatedAt?: unknown;
    reason?: unknown;
}

export const getPublicLocationSort = (sortBy?: PublicLocationSortBy): Record<string, 1 | -1> =>
    sortBy === 'rating_desc'
        ? RATING_DESC_LOCATION_SORT
        : sortBy === 'newest'
            ? NEWEST_LOCATION_SORT
            : RECOMMENDED_LOCATION_SORT;

export interface ModerateLocationVisibilityInput {
    expectedStatus?: unknown;
    expectedUpdatedAt?: unknown;
    reason?: unknown;
}

export interface UpdateLocationInput extends CreateLocationInput {
    expectedStatus?: unknown;
    expectedUpdatedAt?: unknown;
    reason?: unknown;
}

export interface DeleteLocationInput {
    expectedStatus?: unknown;
    expectedUpdatedAt?: unknown;
    reason?: unknown;
}

const requiredString = (value: unknown, field: string, maxLength: number) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${field} là thông tin bắt buộc.`);
    }
    const trimmed = value.trim();
    if (trimmed.length > maxLength) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${field} không được vượt quá ${maxLength} ký tự.`);
    }
    return trimmed;
};

const optionalString = (value: unknown, field: string, maxLength: number) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', `${field} phải là chuỗi.`);
    }
    const trimmed = value.trim();
    if (trimmed.length > maxLength) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${field} không được vượt quá ${maxLength} ký tự.`);
    }
    return trimmed || null;
};

const parseCoordinate = (value: unknown, type: 'latitude' | 'longitude') => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ApiError(422, 'INVALID_COORDINATES', 'Tọa độ không hợp lệ.');
    }
    const [minimum, maximum] = type === 'latitude' ? [-90, 90] : [-180, 180];
    if (value < minimum || value > maximum) {
        throw new ApiError(422, 'INVALID_COORDINATES', 'Tọa độ nằm ngoài phạm vi cho phép.');
    }
    return value;
};

const parseAliases = (value: unknown, normalizedName: string) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
        throw new ApiError(422, 'INVALID_ALIAS', 'Danh sách tên gọi khác không hợp lệ.');
    }

    const aliases = value.map((alias) => {
        const text = requiredString(alias, 'Alias', 200);
        return { value: text, normalizedValue: normalizeSearchText(text) };
    });
    const normalizedAliases = aliases.map(({ normalizedValue }) => normalizedValue);

    if (normalizedAliases.includes(normalizedName)) {
        throw new ApiError(422, 'INVALID_ALIAS', 'Tên gọi khác không được trùng với tên chính.');
    }
    if (new Set(normalizedAliases).size !== normalizedAliases.length) {
        throw new ApiError(422, 'INVALID_ALIAS', 'Tên gọi khác không được trùng nhau.');
    }
    return aliases;
};

const minutesFromTime = (time: string) => {
    const match = TIME_PATTERN.exec(time);
    if (!match) return undefined;
    return Number(match[1]) * 60 + Number(match[2]);
};

const parseOpeningRanges = (rangesValue: unknown): IOpeningRange[] => {
    if (!Array.isArray(rangesValue) || rangesValue.length === 0) {
        throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Mỗi ngày mở cửa phải có ít nhất một khoảng giờ.');
    }

    const ranges = rangesValue.map((rawRange) => {
        if (!rawRange || typeof rawRange !== 'object') {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Khoảng giờ hoạt động không hợp lệ.');
        }
        const range = rawRange as OpeningRangeInput;
        if (typeof range.open !== 'string' || typeof range.close !== 'string') {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Giờ mở và đóng phải có định dạng HH:mm.');
        }
        const openMinutes = minutesFromTime(range.open);
        const closeMinutes = minutesFromTime(range.close);
        if (openMinutes === undefined || closeMinutes === undefined || closeMinutes <= openMinutes) {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Khoảng giờ phải hợp lệ và không được đi qua nửa đêm.');
        }
        return { open: range.open, close: range.close, openMinutes, closeMinutes };
    }).sort((left, right) => left.openMinutes - right.openMinutes);

    for (let index = 1; index < ranges.length; index += 1) {
        const previous = ranges[index - 1];
        const current = ranges[index];
        if (previous && current && current.openMinutes < previous.closeMinutes) {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Các khoảng giờ trong cùng ngày không được chồng lấn.');
        }
    }

    return ranges.map(({ open, close }) => ({ open, close }));
};

const parseOpeningHours = (value: unknown): ILocationOpeningHours => {
    if (value === undefined) return { status: 'unknown', periods: [] };
    if (!value || typeof value !== 'object') {
        throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Giờ hoạt động không hợp lệ.');
    }

    const input = value as OpeningHoursInput;
    if (!['unknown', 'always_open', 'scheduled'].includes(String(input.status))) {
        throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Trạng thái giờ hoạt động không hợp lệ.');
    }
    const status = input.status as ILocationOpeningHours['status'];
    const rawPeriods = input.periods ?? [];
    if (!Array.isArray(rawPeriods)) {
        throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Danh sách giờ hoạt động không hợp lệ.');
    }
    if (status !== 'scheduled') {
        if (rawPeriods.length > 0) {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', `${status} không được chứa khoảng giờ.`);
        }
        return { status, periods: [] };
    }
    if (rawPeriods.length === 0) {
        throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Lịch hoạt động phải có ít nhất một ngày mở cửa.');
    }

    const periods: IOpeningPeriod[] = rawPeriods.map((rawPeriod) => {
        if (!rawPeriod || typeof rawPeriod !== 'object') {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Ngày hoạt động không hợp lệ.');
        }
        const period = rawPeriod as OpeningPeriodInput;
        if (!Number.isInteger(period.dayOfWeek) || Number(period.dayOfWeek) < 1 || Number(period.dayOfWeek) > 7) {
            throw new ApiError(422, 'INVALID_OPENING_HOURS', 'dayOfWeek phải nằm trong khoảng từ 1 đến 7.');
        }
        return {
            dayOfWeek: Number(period.dayOfWeek),
            ranges: parseOpeningRanges(period.ranges),
        };
    });

    const days = periods.map(({ dayOfWeek }) => dayOfWeek);
    if (new Set(days).size !== days.length) {
        throw new ApiError(422, 'INVALID_OPENING_HOURS', 'Mỗi ngày trong tuần chỉ được xuất hiện một lần.');
    }
    return { status, periods: periods.sort((left, right) => left.dayOfWeek - right.dayOfWeek) };
};

export const parseLocationImages = (
    value: unknown,
    userId: string,
    existingImages: ILocation['images'] | undefined = undefined,
) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > MAX_IMAGES) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Location phải có từ 1 đến 5 ảnh.');
    }

    let totalSize = 0;
    const images = value.map((rawImage) => {
        if (!rawImage || typeof rawImage !== 'object') {
            throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Thông tin ảnh không hợp lệ.');
        }
        const image = rawImage as ImageInput;
        if (!Number.isInteger(image.position)) {
            throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh phải có position hợp lệ.');
        }

        if (typeof image.existingImageId === 'string') {
            const existingImage = existingImages?.find(
                (candidate) => candidate._id.toString() === image.existingImageId,
            );
            if (!existingImage || image.assetToken !== undefined) {
                throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh hiện có không thuộc địa điểm này.');
            }
            return {
                _id: existingImage._id,
                url: existingImage.url,
                publicId: existingImage.publicId ?? null,
                position: Number(image.position),
            };
        }

        if (typeof image.assetToken !== 'string') {
            throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh mới phải có assetToken hợp lệ.');
        }
      

        try {
            const asset = verifyLocationImageAssetToken(image.assetToken);
            if (asset.sub !== userId || asset.sizeBytes <= 0 || asset.sizeBytes > MAX_IMAGE_SIZE_BYTES) {
                throw new Error('Asset owner or size is invalid.');
            }
            const url = new URL(asset.url);
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error('Asset URL protocol is invalid.');
            }
            totalSize += asset.sizeBytes;
            return {
                url: asset.url,
                publicId: asset.publicId ?? null,
                position: Number(image.position),
            };
        } catch {
            throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Asset token của ảnh không hợp lệ hoặc đã hết hạn.');
        }
    }).sort((left, right) => left.position - right.position);

    const positions = images.map(({ position }) => position);
    if (positions.some((position, index) => position !== index)) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Vị trí ảnh phải liên tục từ 0.');
    }
    if (totalSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Tổng dung lượng ảnh không được vượt quá 20 MB.');
    }
    const imageKeys = images.map((image) => image.publicId ?? image.url);
    if (new Set(imageKeys).size !== imageKeys.length) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Danh sách ảnh không được chứa ảnh trùng nhau.');
    }
    return images;
};

const validateTags = async (allowedTagCodes: string[], value: unknown) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'tagCodes phải là một mảng mã Tag.');
    }

    const tagCodes = value.map((tag) => String(tag).trim()).filter(Boolean);
    if (new Set(tagCodes).size !== tagCodes.length) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'tagCodes không được chứa mã trùng nhau.');
    }

    const allowedCodes = new Set(allowedTagCodes);
    const groups = await TagGroup.find({ isActive: true, 'tags.code': { $in: tagCodes } })
        .select({ _id: 0, code: 1, selectionMode: 1, tags: 1 })
        .lean();
    const activeTags = new Set(
        groups.flatMap((group) => group.tags.filter(({ isActive }) => isActive).map(({ code }) => code)),
    );
    const invalidTagCodes = tagCodes.filter((code) => !activeTags.has(code) || !allowedCodes.has(code));
    if (invalidTagCodes.length > 0) {
        throw new ApiError(
            422,
            'INVALID_CATEGORY_TAG_COMBINATION',
            'Một số đặc điểm không phù hợp với loại địa điểm đã chọn.',
            { invalidTagCodes },
        );
    }

    for (const group of groups.filter(({ selectionMode }) => selectionMode === 'single')) {
        const selectedCodes = group.tags.map(({ code }) => code).filter((code) => tagCodes.includes(code));
        if (selectedCodes.length > 1) {
            throw new ApiError(
                422,
                'INVALID_CATEGORY_TAG_COMBINATION',
                'Một nhóm đặc điểm chỉ cho phép chọn một giá trị.',
                { groupCode: group.code, selectedTagCodes: selectedCodes },
            );
        }
    }
    return tagCodes;
};

const findDuplicateCandidates = async (
    normalizedName: string,
    longitude: number,
    latitude: number,
    excludedLocationId?: string,
) => {
    await Location.init();
    const excludedFilter = excludedLocationId && mongoose.isValidObjectId(excludedLocationId)
        ? { _id: { $ne: new mongoose.Types.ObjectId(excludedLocationId) } }
        : {};
    const [sameName, nearby] = await Promise.all([
        Location.find({
            ...excludedFilter,
            isDeleted: { $ne: true },
            status: { $ne: 'withdrawn' },
            $or: [{ normalizedName }, { 'aliases.normalizedValue': normalizedName }],
        }).select({ _id: 1, name: 1, categoryCode: 1, status: 1 }).limit(5).lean(),
        Location.aggregate<{
            _id: mongoose.Types.ObjectId;
            name: string;
            categoryCode: string;
            status: string;
            distanceMeters: number;
        }>([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [longitude, latitude] },
                    distanceField: 'distanceMeters',
                    maxDistance: DUPLICATE_RADIUS_METERS,
                    query: { ...excludedFilter, isDeleted: { $ne: true }, status: { $ne: 'withdrawn' } },
                    spherical: true,
                },
            },
            { $limit: 5 },
            { $project: { name: 1, categoryCode: 1, status: 1, distanceMeters: 1 } },
        ]),
    ]);

    const candidates = new Map<string, {
        locationId: string;
        name: string;
        categoryCode: string;
        status: string;
        distanceMeters?: number;
    }>();

    for (const location of sameName) {
        candidates.set(location._id.toString(), {
            locationId: location._id.toString(),
            name: location.name,
            categoryCode: location.categoryCode,
            status: location.status,
        });
    }
    for (const location of nearby) {
        candidates.set(location._id.toString(), {
            locationId: location._id.toString(),
            name: location.name,
            categoryCode: location.categoryCode,
            status: location.status,
            distanceMeters: Math.round(location.distanceMeters),
        });
    }
    return [...candidates.values()].slice(0, 5);
};

const formatAddress = (location: ILocation) => [
    location.address.addressLine,
    location.address.wardNameSnapshot,
    'Thành phố Huế',
].filter(Boolean).join(', ');

const categoryMapFor = async (locations: ILocation[]) => {
    const categoryCodes = [...new Set(locations.map(({ categoryCode }) => categoryCode))];
    const categories = await Category.find({ code: { $in: categoryCodes } })
        .select({ _id: 0, code: 1, name: 1 })
        .lean();
    return new Map(categories.map((category) => [category.code, category.name]));
};

const contributorMapFor = async (locations: ILocation[]) => {
    const contributorIds = [...new Set(locations.map(({ createdBy }) => createdBy.toString()))];
    return userSummaryMapForIds(contributorIds);
};

const userSummaryMapForIds = async (userIds: string[]) => {
    const users = await User.find({ _id: { $in: [...new Set(userIds)] } })
        .select({ email: 1, displayName: 1 })
        .lean();
    return new Map(users.map((user) => [user._id.toString(), {
        id: user._id.toString(),
        displayName: user.displayName,
        email: user.email,
    }]));
};

const editableSnapshot = (location: Pick<
    ILocation,
    'name' | 'description' | 'categoryCode' | 'tagCodes' | 'aliases' | 'address' | 'geo' | 'images' | 'openingHours'
>): ILocationEditSnapshot => ({
    name: location.name,
    description: location.description,
    categoryCode: location.categoryCode,
    tagCodes: [...location.tagCodes],
    aliases: location.aliases.map(({ value }) => value),
    address: {
        wardCode: location.address.wardCode,
        wardNameSnapshot: location.address.wardNameSnapshot,
        addressLine: location.address.addressLine,
        locationNote: location.address.locationNote,
    },
    geo: {
        latitude: location.geo.coordinates[1],
        longitude: location.geo.coordinates[0],
    },
    images: [...location.images]
        .sort((left, right) => left.position - right.position)
        .map(({ url, position }) => ({ url, position })),
    openingHours: {
        status: location.openingHours.status,
        periods: location.openingHours.periods.map(({ dayOfWeek, ranges }) => ({
            dayOfWeek,
            ranges: ranges.map(({ open, close }) => ({ open, close })),
        })),
    },
});

const changedEditableFields = (before: ILocationEditSnapshot, after: ILocationEditSnapshot) => (
    (Object.keys(before) as Array<keyof ILocationEditSnapshot>)
        .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
);

const toLocationSummary = (location: ILocation, categoryNames: Map<string, string>) => ({
    id: location._id.toString(),
    name: location.name,
    category: {
        code: location.categoryCode,
        name: categoryNames.get(location.categoryCode) ?? location.categoryCode,
    },
    formattedAddress: formatAddress(location),
    coverImageUrl: [...location.images].sort((left, right) => left.position - right.position)[0]?.url ?? null,
    averageRating: location.ratingSummary.average,
    reviewCount: location.ratingSummary.count,
    ratingDistribution: location.ratingSummary.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    tagCodes: location.tagCodes,
});

const toLocationDetail = (location: ILocation, categoryName: string) => ({
    ...toLocationSummary(location, new Map([[location.categoryCode, categoryName]])),
    description: location.description,
    aliases: location.aliases.map(({ value }) => value),
    address: {
        wardCode: location.address.wardCode,
        wardName: location.address.wardNameSnapshot,
        addressLine: location.address.addressLine,
        locationNote: location.address.locationNote,
    },
    latitude: location.geo.coordinates[1],
    longitude: location.geo.coordinates[0],
    images: [...location.images]
        .sort((left, right) => left.position - right.position)
        .map((image) => ({ id: image._id.toString(), url: image.url, position: image.position })),
    openingHours: location.openingHours,
    status: location.status,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
});

const toAdminLocationSummary = (
    location: ILocation,
    categoryNames: Map<string, string>,
    contributors: Map<string, { id: string; displayName: string; email: string }>,
) => ({
    ...toLocationSummary(location, categoryNames),
    status: location.status,
    contributor: contributors.get(location.createdBy.toString()) ?? null,
    submittedAt: location.moderation.submittedAt,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
});

const toMyLocationSummary = (location: ILocation, categoryNames: Map<string, string>) => ({
    ...toLocationSummary(location, categoryNames),
    status: location.status,
    rejectionReason: location.moderation.rejectionReason,
    hiddenReason: location.moderation.hiddenReason,
    hiddenAt: location.moderation.hiddenAt,
    restoredAt: location.moderation.restoredAt,
    submittedAt: location.moderation.submittedAt,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
});

const toMyLocationDetail = async (location: ILocation) => {
    const categoryNames = await categoryMapFor([location]);
    return {
        ...toLocationDetail(location, categoryNames.get(location.categoryCode) ?? location.categoryCode),
        moderation: {
            reviewedAt: location.moderation.reviewedAt,
            rejectionReason: location.moderation.rejectionReason,
            submittedAt: location.moderation.submittedAt,
            withdrawnAt: location.moderation.withdrawnAt,
            hiddenAt: location.moderation.hiddenAt,
            hiddenReason: location.moderation.hiddenReason,
            restoredAt: location.moderation.restoredAt,
        },
        editHistory: [...(location.editHistory ?? [])]
            .sort((left, right) => right.editedAt.getTime() - left.editedAt.getTime())
            .map((entry) => ({
                id: entry._id.toString(),
                editedAt: entry.editedAt,
                reason: entry.reason,
                changedFields: entry.changedFields,
            })),
    };
};

const toAdminLocationDetail = async (location: ILocation) => {
    const editHistory = location.editHistory ?? [];
    const [categoryNames, users, duplicateCandidates] = await Promise.all([
        categoryMapFor([location]),
        userSummaryMapForIds([
            location.createdBy.toString(),
            ...editHistory.map(({ editedBy }) => editedBy.toString()),
        ]),
        findDuplicateCandidates(
            location.normalizedName,
            location.geo.coordinates[0],
            location.geo.coordinates[1],
            location._id.toString(),
        ),
    ]);

    return {
        ...toLocationDetail(location, categoryNames.get(location.categoryCode) ?? location.categoryCode),
        contributor: users.get(location.createdBy.toString()) ?? null,
        moderation: {
            reviewedBy: location.moderation.reviewedBy?.toString() ?? null,
            reviewedAt: location.moderation.reviewedAt,
            rejectionReason: location.moderation.rejectionReason,
            submittedAt: location.moderation.submittedAt,
            withdrawnAt: location.moderation.withdrawnAt,
            hiddenBy: location.moderation.hiddenBy?.toString() ?? null,
            hiddenAt: location.moderation.hiddenAt,
            hiddenReason: location.moderation.hiddenReason,
            restoredBy: location.moderation.restoredBy?.toString() ?? null,
            restoredAt: location.moderation.restoredAt,
        },
        editHistory: [...editHistory]
            .sort((left, right) => right.editedAt.getTime() - left.editedAt.getTime())
            .map((entry) => ({
                id: entry._id.toString(),
                editedBy: entry.editedBy.toString(),
                editor: users.get(entry.editedBy.toString()) ?? null,
                editedAt: entry.editedAt,
                reason: entry.reason,
                changedFields: entry.changedFields,
                before: entry.before,
                after: entry.after,
            })),
        duplicateWarning: duplicateCandidates.length > 0,
        duplicateCandidates,
    };
};

export const createLocation = async (input: CreateLocationInput, actor: Actor) => {
    if (!mongoose.isValidObjectId(actor.id)) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
    }
    const user = await User.findById(actor.id).select({ role: 1, status: 1 });
    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    const name = requiredString(input.name, 'Tên địa điểm', 200);
    const normalizedName = normalizeSearchText(name);
    const description = requiredString(input.description, 'Mô tả', 5000);
    const categoryCode = requiredString(input.categoryCode, 'Category', 100).toLowerCase();
    const category = await Category.findOne({ code: categoryCode, isActive: true })
        .select({ code: 1, name: 1, allowedTagCodes: 1 });
    if (!category) {
        throw new ApiError(422, 'INVALID_CATEGORY_TAG_COMBINATION', 'Category không tồn tại hoặc đã ngừng hoạt động.');
    }

    const tagCodes = await validateTags(category.allowedTagCodes, input.tagCodes);
    const aliases = parseAliases(input.aliases, normalizedName);
    const wardCode = requiredString(input.wardCode, 'Phường/xã', 20);
    const ward = getWardByCode(wardCode);
    if (!ward) {
        throw new ApiError(422, 'INVALID_WARD', 'Mã phường/xã không hợp lệ hoặc đã ngừng hoạt động.');
    }
    const addressLine = requiredString(input.addressLine, 'Địa chỉ', 500);
    const locationNote = optionalString(input.locationNote, 'Ghi chú vị trí', 1000);
    const latitude = parseCoordinate(input.latitude, 'latitude');
    const longitude = parseCoordinate(input.longitude, 'longitude');
    const openingHours = parseOpeningHours(input.openingHours);
    const images = parseLocationImages(input.images, user._id.toString());
    const duplicateCandidates = await findDuplicateCandidates(normalizedName, longitude, latitude);
    const now = new Date();
    const status = user.role === 'admin' || user.role === 'mod' ? 'approved' : 'pending';
    const searchText = normalizeSearchText([
        name,
        ...aliases.map(({ value }) => value),
        category.name,
        ...tagCodes,
        addressLine,
        ward.name,
        description,
    ].join(' '));

    const location = await Location.create({
        createdBy: user._id,
        name,
        normalizedName,
        description,
        categoryCode,
        tagCodes,
        aliases,
        address: {
            wardCode,
            wardNameSnapshot: ward.name,
            addressLine,
            locationNote,
        },
        geo: { type: 'Point', coordinates: [longitude, latitude] },
        images,
        openingHours,
        ratingSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        status,
        moderation: {
            reviewedBy: status === 'approved' ? user._id : null,
            reviewedAt: status === 'approved' ? now : null,
            rejectionReason: null,
            submittedAt: now,
            withdrawnAt: null,
            hiddenBy: null,
            hiddenAt: null,
            hiddenReason: null,
            restoredBy: null,
            restoredAt: null,
        },
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        deletedFromStatus: null,
        searchText,
    });

    return {
        ...toLocationDetail(location, category.name),
        duplicateWarning: duplicateCandidates.length > 0,
        duplicateCandidates,
    };
};

const positiveInteger = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Thông tin phân trang không hợp lệ.');
    }
    return maximum ? Math.min(number, maximum) : number;
};

const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildPublicLocationFilter = (query: PublicLocationQuery): Record<string, unknown> => {
    const filter: Record<string, unknown> = { status: 'approved', isDeleted: { $ne: true } };

    if (query.q !== undefined) {
        const trimmedQuery = query.q.trim();
        if (trimmedQuery.length > 200) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm không được vượt quá 200 ký tự.');
        }
        const normalizedQuery = normalizeSearchText(trimmedQuery);
        if (trimmedQuery && !normalizedQuery) {
            throw new ApiError(
                400,
                'INVALID_SEARCH_QUERY',
                'Nội dung tìm kiếm phải chứa chữ hoặc số.',
            );
        }
        if (normalizedQuery) {
            filter.searchText = { $regex: escapeRegularExpression(normalizedQuery), $options: 'i' };
        }
    }

    if (query.categoryCode) filter.categoryCode = query.categoryCode.trim().toLowerCase();
    if (query.wardCode) filter['address.wardCode'] = query.wardCode.trim();

    if (query.tagCodes !== undefined) {
        const tagCodes = [...new Set(query.tagCodes
            .split(',')
            .map((code) => code.trim().toLowerCase())
            .filter(Boolean))];
        if (tagCodes.some((code) => !/^[a-z0-9_]+$/.test(code))) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Danh sách đặc điểm lọc không hợp lệ.');
        }
        if (tagCodes.length > 0) filter.tagCodes = { $all: tagCodes };
    }

    return filter;
};

export const getPublicLocations = async (query: PublicLocationQuery) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 12, 100);

    const filter = buildPublicLocationFilter(query);

    /*
     * Default browse:
     * - ưu tiên Location được đánh giá tốt;
     * - nếu cùng rating thì ưu tiên Location có nhiều review hơn;
     * - createdAt chỉ là tiêu chí phụ;
     *
     * Khi client chủ động chọn rating_desc thì dùng sort đánh giá thuần.
     */
    const sort = getPublicLocationSort(query.sortBy);

    const [locations, total] = await Promise.all([
        Location.find(filter)
            .sort(sort)
            .skip((page - 1) * pageSize)
            .limit(pageSize),

        Location.countDocuments(filter),
    ]);

    const categoryNames = await categoryMapFor(locations);

    return {
        data: locations.map((location) =>
            toLocationSummary(location, categoryNames)
        ),
        meta: {
            page,
            pageSize,
            total,
            totalPages: total === 0
                ? 0
                : Math.ceil(total / pageSize),
        },
    };
};

export const getPublicLocationById = async (locationId: string) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const location = await Location.findOne({ _id: locationId, status: 'approved', isDeleted: { $ne: true } });
    if (!location) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const category = await Category.findOne({ code: location.categoryCode }).select({ name: 1 });
    return toLocationDetail(location, category?.name ?? location.categoryCode);
};

const LOCATION_STATUSES: LocationStatus[] = ['pending', 'approved', 'rejected', 'withdrawn', 'hidden'];
const MY_LOCATION_STATUSES: LocationStatus[] = ['pending', 'approved', 'rejected', 'withdrawn', 'hidden'];

export const getAdminLocations = async (query: AdminLocationQuery) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 12, 100);
    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

    if (query.status) {
        const status = query.status.trim().toLowerCase() as LocationStatus;
        if (!LOCATION_STATUSES.includes(status)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái Location không hợp lệ.');
        }
        filter.status = status;
    }
    if (query.categoryCode) filter.categoryCode = query.categoryCode.trim().toLowerCase();
    if (query.wardCode) filter['address.wardCode'] = query.wardCode.trim();

    const [locations, total] = await Promise.all([
        Location.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        Location.countDocuments(filter),
    ]);
    const [categoryNames, contributors] = await Promise.all([
        categoryMapFor(locations),
        contributorMapFor(locations),
    ]);

    return {
        data: locations.map((location) => toAdminLocationSummary(location, categoryNames, contributors)),
        meta: {
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
    };
};

export const getMyLocations = async (actor: Actor, query: MyLocationQuery) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 12, 100);
    const filter: Record<string, unknown> = {
        createdBy: actor.id,
        isDeleted: { $ne: true },
    };

    if (query.status) {
        const status = query.status.trim().toLowerCase() as LocationStatus;
        if (!MY_LOCATION_STATUSES.includes(status)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái Location không hợp lệ.');
        }
        filter.status = status;
    }

    const [locations, total] = await Promise.all([
        Location.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        Location.countDocuments(filter),
    ]);
    const categoryNames = await categoryMapFor(locations);

    return {
        data: locations.map((location) => toMyLocationSummary(location, categoryNames)),
        meta: {
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
    };
};

export const getMyLocationById = async (locationId: string, actor: Actor) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    const location = await Location.findOne({
        _id: locationId,
        createdBy: actor.id,
        isDeleted: { $ne: true },
    });
    if (!location) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    return toMyLocationDetail(location);
};

export const getAdminLocationById = async (locationId: string) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const location = await Location.findOne({ _id: locationId, isDeleted: { $ne: true } });
    if (!location) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    return toAdminLocationDetail(location);
};

const assertActiveModerator = async (actor: Actor) => {
    if (!mongoose.isValidObjectId(actor.id)) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
    }
    const user = await User.findById(actor.id).select({ role: 1, status: 1 });
    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }
    if (user.role !== 'admin' && user.role !== 'mod') {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền kiểm duyệt địa điểm.');
    }
    return user;
};

const assertActiveAdmin = async (actor: Actor) => {
    const user = await assertActiveModerator(actor);
    if (user.role !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn không có quyền quản lý địa điểm.');
    }
    return user;
};

const parseExpectedUpdatedAt = (value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'expectedUpdatedAt là thông tin bắt buộc.');
    }
    const expectedUpdatedAt = new Date(value);
    if (Number.isNaN(expectedUpdatedAt.getTime())) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'expectedUpdatedAt không hợp lệ.');
    }
    return expectedUpdatedAt;
};

const throwAdminLocationConflict = async (locationId: string): Promise<never> => {
    const current = await Location.findOne({ _id: locationId, isDeleted: { $ne: true } })
        .select({ status: 1, updatedAt: 1 })
        .lean();
    if (!current) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    throw new ApiError(
        409,
        'STALE_RESOURCE',
        'Dữ liệu đã được thay đổi. Vui lòng tải lại.',
        { currentStatus: current.status, currentUpdatedAt: current.updatedAt },
    );
};

const parseOwnerLocationPrecondition = (
    input: Pick<UpdateLocationInput, 'expectedStatus' | 'expectedUpdatedAt'>,
    allowedStatuses: LocationStatus[],
) => {
    if (typeof input.expectedStatus !== 'string' || !allowedStatuses.includes(input.expectedStatus as LocationStatus)) {
        throw new ApiError(400, 'INVALID_STATUS_TRANSITION', 'Trạng thái địa điểm không phù hợp với thao tác này.');
    }
    return {
        expectedStatus: input.expectedStatus as LocationStatus,
        expectedUpdatedAt: parseExpectedUpdatedAt(input.expectedUpdatedAt),
    };
};

const throwOwnerLocationConflict = async (locationId: string, actor: Actor): Promise<never> => {
    const current = await Location.findOne({
        _id: locationId,
        createdBy: actor.id,
        isDeleted: { $ne: true },
    }).select({ status: 1, updatedAt: 1 }).lean();
    if (!current) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    throw new ApiError(
        409,
        'STALE_RESOURCE',
        'Dữ liệu đã được thay đổi. Vui lòng tải lại trước khi tiếp tục.',
        { currentStatus: current.status, currentUpdatedAt: current.updatedAt },
    );
};

const prepareLocationUpdate = async (
    current: ILocation,
    input: UpdateLocationInput,
    editorId: string,
    requireReason: boolean,
) => {
    const optionalReason = optionalString(input.reason, 'Lý do chỉnh sửa', 1000);
    const reason = requireReason
        ? requiredString(input.reason, 'Lý do chỉnh sửa', 1000)
        : optionalReason ?? 'Người đóng góp cập nhật thông tin.';
    const name = requiredString(input.name, 'Tên địa điểm', 200);
    const normalizedName = normalizeSearchText(name);
    const description = requiredString(input.description, 'Mô tả', 5000);
    const categoryCode = requiredString(input.categoryCode, 'Category', 100).toLowerCase();
    const category = await Category.findOne({ code: categoryCode, isActive: true })
        .select({ code: 1, name: 1, allowedTagCodes: 1 });
    if (!category) {
        throw new ApiError(422, 'INVALID_CATEGORY_TAG_COMBINATION', 'Category không tồn tại hoặc đã ngừng hoạt động.');
    }
    const tagCodes = await validateTags(category.allowedTagCodes, input.tagCodes);
    const aliases = parseAliases(input.aliases, normalizedName);
    const wardCode = requiredString(input.wardCode, 'Phường/xã', 20);
    const ward = getWardByCode(wardCode);
    if (!ward) {
        throw new ApiError(422, 'INVALID_WARD', 'Mã phường/xã không hợp lệ hoặc đã ngừng hoạt động.');
    }
    const addressLine = requiredString(input.addressLine, 'Địa chỉ', 500);
    const locationNote = optionalString(input.locationNote, 'Ghi chú vị trí', 1000);
    const latitude = parseCoordinate(input.latitude, 'latitude');
    const longitude = parseCoordinate(input.longitude, 'longitude');
    const openingHours = parseOpeningHours(input.openingHours);
    const images = input.images === undefined
        ? current.images
        : parseLocationImages(input.images, editorId, current.images);
    const searchText = normalizeSearchText([
        name,
        ...aliases.map(({ value }) => value),
        category.name,
        ...tagCodes,
        addressLine,
        ward.name,
        description,
    ].join(' '));
    const before = editableSnapshot(current);
    const after: ILocationEditSnapshot = {
        name,
        description,
        categoryCode,
        tagCodes,
        aliases: aliases.map(({ value }) => value),
        address: {
            wardCode,
            wardNameSnapshot: ward.name,
            addressLine,
            locationNote,
        },
        geo: { latitude, longitude },
        images: [...images]
            .sort((left, right) => left.position - right.position)
            .map(({ url, position }) => ({ url, position })),
        openingHours,
    };
    const changedFields = changedEditableFields(before, after);
    if (changedFields.length === 0) {
        throw new ApiError(400, 'NO_CHANGES', 'Không có nội dung nào được thay đổi.');
    }
    const keptPublicIds = new Set(images.map(({ publicId }) => publicId).filter(Boolean));
    const removedPublicIds = current.images
        .map(({ publicId }) => publicId)
        .filter((publicId): publicId is string => Boolean(publicId) && !keptPublicIds.has(publicId));

    return {
        fields: {
            isDeleted: false,
            name,
            normalizedName,
            description,
            categoryCode,
            tagCodes,
            aliases,
            address: {
                wardCode,
                wardNameSnapshot: ward.name,
                addressLine,
                locationNote,
            },
            geo: { type: 'Point' as const, coordinates: [longitude, latitude] },
            images,
            openingHours,
            searchText,
        },
        history: {
            editedBy: new mongoose.Types.ObjectId(editorId),
            editedAt: new Date(),
            reason,
            changedFields,
            before,
            after,
        },
        removedPublicIds,
    };
};

export const updateAdminLocation = async (
    locationId: string,
    input: UpdateLocationInput,
    actor: Actor,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const [manager, current, expectedUpdatedAt] = await Promise.all([
        assertActiveModerator(actor),
        Location.findOne({ _id: locationId, isDeleted: { $ne: true } }),
        Promise.resolve(parseExpectedUpdatedAt(input.expectedUpdatedAt)),
    ]);
    if (!current) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    if (manager.role === 'mod' && current.status !== 'pending') {
        throw new ApiError(
            403,
            'MODERATOR_CAN_ONLY_EDIT_PENDING',
            'Kiểm duyệt viên chỉ được chỉnh sửa địa điểm đang chờ duyệt.',
        );
    }

    const prepared = await prepareLocationUpdate(current, input, manager._id.toString(), true);

    const location = await Location.findOneAndUpdate(
        {
            _id: locationId,
            isDeleted: { $ne: true },
            updatedAt: expectedUpdatedAt,
            ...(manager.role === 'mod' ? { status: 'pending' } : {}),
        },
        {
            $set: prepared.fields,
            $push: { editHistory: prepared.history },
        },
        { new: true, runValidators: true },
    );
    if (!location) return throwAdminLocationConflict(locationId);

    return {
        location: await toAdminLocationDetail(location),
        removedPublicIds: prepared.removedPublicIds,
    };
};

export const updateMyLocation = async (
    locationId: string,
    input: UpdateLocationInput,
    actor: Actor,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    const { expectedStatus, expectedUpdatedAt } = parseOwnerLocationPrecondition(
        input,
        ['pending', 'rejected'],
    );
    const current = await Location.findOne({
        _id: locationId,
        createdBy: actor.id,
        isDeleted: { $ne: true },
    });
    if (!current) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    if (current.status !== 'pending' && current.status !== 'rejected') {
        throw new ApiError(
            409,
            'INVALID_STATUS_TRANSITION',
            'Chỉ có thể chỉnh sửa địa điểm đang chờ duyệt hoặc đã bị từ chối.',
        );
    }

    const prepared = await prepareLocationUpdate(current, input, actor.id, false);
    const location = await Location.findOneAndUpdate(
        {
            _id: locationId,
            createdBy: actor.id,
            isDeleted: { $ne: true },
            status: expectedStatus,
            updatedAt: expectedUpdatedAt,
        },
        {
            $set: prepared.fields,
            $push: { editHistory: prepared.history },
        },
        { new: true, runValidators: true },
    );
    if (!location) return throwOwnerLocationConflict(locationId, actor);

    return {
        location: await toMyLocationDetail(location),
        removedPublicIds: prepared.removedPublicIds,
    };
};

export const resubmitMyLocation = async (
    locationId: string,
    input: UpdateLocationInput,
    actor: Actor,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    const { expectedUpdatedAt } = parseOwnerLocationPrecondition(input, ['rejected']);
    const submittedAt = new Date();
    const location = await Location.findOneAndUpdate(
        {
            _id: locationId,
            createdBy: actor.id,
            isDeleted: { $ne: true },
            status: 'rejected',
            updatedAt: expectedUpdatedAt,
        },
        {
            $set: {
                status: 'pending',
                'moderation.reviewedBy': null,
                'moderation.reviewedAt': null,
                'moderation.rejectionReason': null,
                'moderation.submittedAt': submittedAt,
                'moderation.withdrawnAt': null,
                updatedAt: submittedAt,
            },
        },
        { new: true, runValidators: true },
    );
    if (!location) return throwOwnerLocationConflict(locationId, actor);
    return toMyLocationDetail(location);
};

export const withdrawMyLocation = async (
    locationId: string,
    input: UpdateLocationInput,
    actor: Actor,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    const { expectedStatus, expectedUpdatedAt } = parseOwnerLocationPrecondition(
        input,
        ['pending', 'rejected'],
    );
    const withdrawnAt = new Date();
    const location = await Location.findOneAndUpdate(
        {
            _id: locationId,
            createdBy: actor.id,
            isDeleted: { $ne: true },
            status: expectedStatus,
            updatedAt: expectedUpdatedAt,
        },
        {
            $set: {
                status: 'withdrawn',
                'moderation.withdrawnAt': withdrawnAt,
                updatedAt: withdrawnAt,
            },
        },
        { new: true, runValidators: true },
    );
    if (!location) return throwOwnerLocationConflict(locationId, actor);
    return toMyLocationDetail(location);
};

export const deleteMyWithdrawnLocation = async (
    locationId: string,
    input: DeleteLocationInput,
    actor: Actor,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm đã đóng góp.');
    }
    if (input.expectedStatus !== 'withdrawn') {
        throw new ApiError(
            400,
            'INVALID_STATUS_TRANSITION',
            'Chỉ có thể xóa vĩnh viễn địa điểm đã rút.',
        );
    }
    const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);
    const location = await Location.findOneAndDelete({
        _id: locationId,
        createdBy: actor.id,
        isDeleted: { $ne: true },
        status: 'withdrawn',
        updatedAt: expectedUpdatedAt,
    });
    if (!location) return throwOwnerLocationConflict(locationId, actor);

    await Promise.allSettled([
        Bookmark.deleteMany({ targetType: 'location', targetId: location._id }),
        Notification.deleteMany({ locationId: location._id }),
    ]);

    return {
        deleted: true,
        removedPublicIds: location.images
            .map(({ publicId }) => publicId)
            .filter((publicId): publicId is string => Boolean(publicId)),
    };
};

export const deleteAdminLocation = async (
    locationId: string,
    input: DeleteLocationInput,
    actor: Actor,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const [admin, expectedUpdatedAt] = await Promise.all([
        assertActiveAdmin(actor),
        Promise.resolve(parseExpectedUpdatedAt(input.expectedUpdatedAt)),
    ]);
    const deletableStatuses: LocationStatus[] = ['hidden', 'rejected', 'withdrawn'];
    if (typeof input.expectedStatus !== 'string' || !deletableStatuses.includes(input.expectedStatus as LocationStatus)) {
        throw new ApiError(
            400,
            'INVALID_STATUS_TRANSITION',
            'Chỉ có thể xóa địa điểm đã ẩn, bị từ chối hoặc đã rút.',
        );
    }
    const expectedStatus = input.expectedStatus as Extract<LocationStatus, 'hidden' | 'rejected' | 'withdrawn'>;
    const reason = requiredString(input.reason, 'Lý do xóa', 1000);
    const deletedAt = new Date();
    const location = await Location.findOneAndUpdate(
        {
            _id: locationId,
            isDeleted: { $ne: true },
            status: expectedStatus,
            updatedAt: expectedUpdatedAt,
        },
        {
            $set: {
                isDeleted: true,
                deletedAt,
                deletedBy: admin._id,
                deletionReason: reason,
                deletedFromStatus: expectedStatus,
                updatedAt: deletedAt,
            },
        },
        { new: true, runValidators: true },
    );
    if (!location) return throwAdminLocationConflict(locationId);
    await Promise.allSettled([
        Bookmark.deleteMany({ targetType: 'location', targetId: location._id }),
    ]);
    return { deleted: true };
};

const parseModerationPrecondition = (input: ModerateLocationInput) => {
    if (input.expectedStatus !== 'pending') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'expectedStatus phải là pending.');
    }
    if (typeof input.expectedUpdatedAt !== 'string' || input.expectedUpdatedAt.trim().length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'expectedUpdatedAt là thông tin bắt buộc.');
    }
    const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
    if (Number.isNaN(expectedUpdatedAt.getTime())) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'expectedUpdatedAt không hợp lệ.');
    }
    return expectedUpdatedAt;
};

const throwModerationConflict = async (locationId: string): Promise<never> => {
    const current = await Location.findOne({ _id: locationId, isDeleted: { $ne: true } })
        .select({ status: 1, updatedAt: 1 })
        .lean();
    if (!current) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    throw new ApiError(
        409,
        'STALE_RESOURCE',
        'Dữ liệu đã được thay đổi. Vui lòng tải lại.',
        { currentStatus: current.status, currentUpdatedAt: current.updatedAt },
    );
};

const moderatePendingLocation = async (
    locationId: string,
    input: ModerateLocationInput,
    actor: Actor,
    nextStatus: Extract<LocationStatus, 'approved' | 'rejected'>,
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const [admin, expectedUpdatedAt] = await Promise.all([
        assertActiveModerator(actor),
        Promise.resolve(parseModerationPrecondition(input)),
    ]);
    const reason = nextStatus === 'rejected'
        ? requiredString(input.reason, 'Lý do từ chối', 1000)
        : null;
    const reviewedAt = new Date();

    const location = await Location.findOneAndUpdate(
        { _id: locationId, isDeleted: { $ne: true }, status: 'pending', updatedAt: expectedUpdatedAt },
        {
            $set: {
                status: nextStatus,
                'moderation.reviewedBy': admin._id,
                'moderation.reviewedAt': reviewedAt,
                'moderation.rejectionReason': reason,
                updatedAt: reviewedAt,
            },
        },
        { new: true, runValidators: true },
    );

    if (!location) {
        return throwModerationConflict(locationId);
    }
    await safeCreateLocationNotification({
        userId: location.createdBy,
        locationId: location._id,
        type: nextStatus === 'approved' ? 'LOCATION_APPROVED' : 'LOCATION_REJECTED',
        locationName: location.name,
        reason: location.moderation.rejectionReason,
    });
    return {
        id: location._id.toString(),
        status: location.status,
        moderation: {
            reviewedBy: location.moderation.reviewedBy?.toString() ?? null,
            reviewedAt: location.moderation.reviewedAt,
            rejectionReason: location.moderation.rejectionReason,
        },
        updatedAt: location.updatedAt,
    };
};

export const approveLocation = (
    locationId: string,
    input: ModerateLocationInput,
    actor: Actor,
) => moderatePendingLocation(locationId, input, actor, 'approved');

export const rejectLocation = (
    locationId: string,
    input: ModerateLocationInput,
    actor: Actor,
) => moderatePendingLocation(locationId, input, actor, 'rejected');

const moderateLocationVisibility = async (
    locationId: string,
    input: ModerateLocationVisibilityInput,
    actor: Actor,
    transition: 'hide' | 'restore',
) => {
    if (!mongoose.isValidObjectId(locationId)) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy địa điểm.');
    }
    const [moderator, expectedUpdatedAt] = await Promise.all([
        assertActiveModerator(actor),
        Promise.resolve(parseExpectedUpdatedAt(input.expectedUpdatedAt)),
    ]);
    const expectedStatus = transition === 'hide' ? 'approved' : 'hidden';
    if (input.expectedStatus !== expectedStatus) {
        throw new ApiError(
            400,
            'INVALID_STATUS_TRANSITION',
            transition === 'hide'
                ? 'Chỉ có thể ẩn địa điểm đang được công khai.'
                : 'Chỉ có thể hiện lại địa điểm đang bị ẩn.',
        );
    }

    const changedAt = new Date();
    const nextStatus: Extract<LocationStatus, 'approved' | 'hidden'> = transition === 'hide' ? 'hidden' : 'approved';
    const visibilityFields = transition === 'hide'
        ? {
            'moderation.hiddenBy': moderator._id,
            'moderation.hiddenAt': changedAt,
            'moderation.hiddenReason': requiredString(input.reason, 'Lý do ẩn', 1000),
            'moderation.restoredBy': null,
            'moderation.restoredAt': null,
        }
        : {
            'moderation.restoredBy': moderator._id,
            'moderation.restoredAt': changedAt,
        };

    const location = await Location.findOneAndUpdate(
        {
            _id: locationId,
            isDeleted: { $ne: true },
            status: expectedStatus,
            updatedAt: expectedUpdatedAt,
        },
        {
            $set: {
                status: nextStatus,
                ...visibilityFields,
                updatedAt: changedAt,
            },
        },
        { new: true, runValidators: true },
    );
    if (!location) return throwModerationConflict(locationId);

    await safeCreateLocationNotification({
        userId: location.createdBy,
        locationId: location._id,
        type: transition === 'hide' ? 'LOCATION_HIDDEN' : 'LOCATION_RESTORED',
        locationName: location.name,
        reason: transition === 'hide' ? location.moderation.hiddenReason : null,
    });

    return {
        id: location._id.toString(),
        status: location.status,
        moderation: {
            hiddenBy: location.moderation.hiddenBy?.toString() ?? null,
            hiddenAt: location.moderation.hiddenAt,
            hiddenReason: location.moderation.hiddenReason,
            restoredBy: location.moderation.restoredBy?.toString() ?? null,
            restoredAt: location.moderation.restoredAt,
        },
        updatedAt: location.updatedAt,
    };
};

export const hideLocation = (
    locationId: string,
    input: ModerateLocationVisibilityInput,
    actor: Actor,
) => moderateLocationVisibility(locationId, input, actor, 'hide');

export const restoreLocation = (
    locationId: string,
    input: ModerateLocationVisibilityInput,
    actor: Actor,
) => moderateLocationVisibility(locationId, input, actor, 'restore');
