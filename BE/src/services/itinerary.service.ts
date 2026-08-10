import mongoose from 'mongoose';
import Itinerary, { MAX_ITEMS_PER_DAY, MAX_ITINERARY_DAYS } from '../models/itinerary.model.ts';
import type { IItinerary, ItineraryVisibility } from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

interface Actor {
    id: string;
    role: 'user' | 'admin';
}

interface ItemInput {
    locationId?: unknown;
    order?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    durationMinutes?: unknown;
    note?: unknown;
}

interface DayInput {
    dayNumber?: unknown;
    items?: unknown;
}

interface ValidatedItem {
    locationId: mongoose.Types.ObjectId;
    order: number;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
    note: string | null;
}

interface ValidatedDay {
    dayNumber: number;
    items: ValidatedItem[];
}

export interface CreateItineraryInput {
    title?: unknown;
    description?: unknown;
    startDate?: unknown;
    visibility?: unknown;
    days?: unknown;
}

export interface UpdateItineraryInput extends CreateItineraryInput {}

export interface PublicItineraryQuery {
    page?: string;
    pageSize?: string;
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const CREATE_FIELDS = new Set(['title', 'description', 'startDate', 'visibility', 'days']);
const UPDATE_FIELDS = new Set(['title', 'description', 'startDate', 'visibility', 'days']);

const validationError = (message: string, details?: Record<string, unknown>): never => {
    throw new ApiError(400, 'VALIDATION_ERROR', message, details);
};

const assertPayload = (input: unknown, allowedFields: Set<string>, requireField: boolean) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return validationError('Body request phải là một object JSON.');
    }
    const fields = Object.keys(input);
    const unknownFields = fields.filter((field) => !allowedFields.has(field));
    if (unknownFields.length > 0) {
        validationError('Body request chứa field không được hỗ trợ.', { unknownFields });
    }
    if (requireField && fields.length === 0) {
        validationError('Không có dữ liệu hợp lệ để cập nhật.');
    }
};

const requiredString = (value: unknown, field: string, maximum: number) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return validationError(`${field} là thông tin bắt buộc.`);
    }
    const result = value.trim();
    if (result.length > maximum) return validationError(`${field} không được vượt quá ${maximum} ký tự.`);
    return result;
};

const optionalText = (value: unknown, field: string, maximum: number, nullable = false) => {
    if (value === undefined) return undefined;
    if (value === null && nullable) return null;
    if (typeof value !== 'string') return validationError(`${field} phải là chuỗi.`);
    const result = value.trim();
    if (result.length > maximum) return validationError(`${field} không được vượt quá ${maximum} ký tự.`);
    return nullable ? (result || null) : result;
};

const parseVisibility = (value: unknown): ItineraryVisibility => {
    if (value !== 'private' && value !== 'public') {
        return validationError('visibility phải là private hoặc public.');
    }
    return value;
};

const parseStartDate = (value: unknown) => {
    if (value === null || value === '') return null;
    if (typeof value !== 'string' && !(value instanceof Date)) {
        return validationError('startDate không hợp lệ.');
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return validationError('startDate không hợp lệ.');
    return date;
};

const parseTime = (value: unknown, field: string) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
        return validationError(`${field} phải có định dạng HH:mm.`);
    }
    return value;
};

const timeToMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

const itemEndMinutes = (item: Pick<ValidatedItem, 'startTime' | 'endTime' | 'durationMinutes'>) => {
    if (item.endTime) return timeToMinutes(item.endTime);
    if (item.startTime && item.durationMinutes) return timeToMinutes(item.startTime) + item.durationMinutes;
    return null;
};

const parseDays = (value: unknown): ValidatedDay[] => {
    if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITINERARY_DAYS) {
        return validationError(`Itinerary phải có từ 1 đến ${MAX_ITINERARY_DAYS} ngày.`);
    }

    const days = value.map((rawDay, dayIndex) => {
        if (!rawDay || typeof rawDay !== 'object') return validationError('Ngày trong Itinerary không hợp lệ.');
        const day = rawDay as DayInput;
        if (!Number.isInteger(day.dayNumber) || Number(day.dayNumber) < 1) {
            return validationError('dayNumber phải là số nguyên dương.');
        }
        if (!Array.isArray(day.items) || day.items.length < 1 || day.items.length > MAX_ITEMS_PER_DAY) {
            return validationError(`Mỗi ngày phải có từ 1 đến ${MAX_ITEMS_PER_DAY} địa điểm.`);
        }

        const items = day.items.map((rawItem, itemIndex) => {
            if (!rawItem || typeof rawItem !== 'object') return validationError('Item trong Itinerary không hợp lệ.');
            const item = rawItem as ItemInput;
            if (typeof item.locationId !== 'string' || !mongoose.isValidObjectId(item.locationId)) {
                return validationError('locationId không hợp lệ.');
            }
            if (!Number.isInteger(item.order) || Number(item.order) < 1) {
                return validationError('order phải là số nguyên dương.');
            }
            const startTime = parseTime(item.startTime, 'startTime');
            const endTime = parseTime(item.endTime, 'endTime');
            if (startTime && endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
                return validationError('endTime phải sau startTime trong cùng ngày.');
            }
            let durationMinutes: number | null = null;
            if (item.durationMinutes !== undefined && item.durationMinutes !== null) {
                if (!Number.isInteger(item.durationMinutes) || Number(item.durationMinutes) < 1) {
                    return validationError('durationMinutes phải là số nguyên dương.');
                }
                durationMinutes = Number(item.durationMinutes);
            }
            return {
                locationId: new mongoose.Types.ObjectId(item.locationId),
                order: Number(item.order),
                startTime,
                endTime,
                durationMinutes,
                note: optionalText(item.note, 'note', 2000, true) ?? null,
            };
        });

        const orders = items.map(({ order }) => order).sort((left, right) => left - right);
        if (orders.some((order, index) => order !== index + 1)) {
            return validationError(`order của các item ngày ${day.dayNumber} phải liên tục từ 1.`);
        }

        const locationIds = items.map(({ locationId }) => locationId.toString());
        if (new Set(locationIds).size !== locationIds.length) {
            return validationError(`Một Location không được xuất hiện nhiều lần trong ngày ${day.dayNumber}.`);
        }

        const orderedItems = [...items].sort((left, right) => left.order - right.order);
        for (let index = 0; index < orderedItems.length; index += 1) {
            const item = orderedItems[index];
            if (!item) continue;
            const startMinutes = item.startTime ? timeToMinutes(item.startTime) : null;
            const endMinutes = itemEndMinutes(item);
            if (endMinutes !== null && endMinutes > 24 * 60) {
                return validationError(`Thời gian item thứ ${item.order} ngày ${day.dayNumber} vượt quá một ngày.`);
            }
            if (item.startTime && item.endTime && item.durationMinutes
                && timeToMinutes(item.endTime) - timeToMinutes(item.startTime) !== item.durationMinutes) {
                return validationError(`durationMinutes không khớp startTime/endTime ở ngày ${day.dayNumber}.`);
            }
            const previous = orderedItems[index - 1];
            if (!previous || startMinutes === null) continue;
            const previousStart = previous.startTime ? timeToMinutes(previous.startTime) : null;
            const previousEnd = itemEndMinutes(previous);
            if (previousStart !== null && startMinutes < previousStart) {
                return validationError(`Thời gian item ngày ${day.dayNumber} phải tăng theo order.`);
            }
            if (previousEnd !== null && startMinutes < previousEnd) {
                return validationError(`Các item ngày ${day.dayNumber} không được chồng lấn thời gian.`);
            }
        }
        return { dayNumber: Number(day.dayNumber), items };
    });

    const numbers = days.map(({ dayNumber }) => dayNumber).sort((left, right) => left - right);
    if (numbers.some((number, index) => number !== index + 1)) {
        return validationError('dayNumber phải liên tục từ 1.');
    }
    return days.sort((left, right) => left.dayNumber - right.dayNumber);
};

const isoDayOfWeek = (startDate: Date, dayNumber: number) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayNumber - 1);
    const sundayBasedDay = date.getUTCDay();
    return sundayBasedDay === 0 ? 7 : sundayBasedDay;
};

const assertLocationsAndOpeningHours = async (days: ValidatedDay[], startDate: Date | null) => {
    const ids = [...new Set(days.flatMap((day) => day.items.map((item) => item.locationId.toString())))];
    const locations = await Location.find({ _id: { $in: ids } })
        .select({ _id: 1, name: 1, status: 1, openingHours: 1 })
        .lean();
    const locationMap = new Map(locations.map((location) => [location._id.toString(), location]));
    const missingLocationIds = ids.filter((id) => !locationMap.has(id));
    if (missingLocationIds.length > 0) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Một số Location không còn tồn tại.', {
            missingLocationIds,
        });
    }
    const unapprovedLocationIds = ids.filter((id) => locationMap.get(id)?.status !== 'approved');
    if (unapprovedLocationIds.length > 0) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Itinerary chỉ được nhận Location đã được duyệt.', {
            unapprovedLocationIds,
        });
    }

    if (!startDate) return;
    for (const day of days) {
        const dayOfWeek = isoDayOfWeek(startDate, day.dayNumber);
        for (const item of day.items) {
            const location = locationMap.get(item.locationId.toString());
            if (!location || location.openingHours.status !== 'scheduled') continue;
            const period = location.openingHours.periods.find((candidate) => candidate.dayOfWeek === dayOfWeek);
            if (!period) {
                throw new ApiError(422, 'VALIDATION_ERROR', 'Location đóng cửa vào ngày đã xếp trong Itinerary.', {
                    locationId: item.locationId.toString(),
                    dayNumber: day.dayNumber,
                    dayOfWeek,
                });
            }

            const startMinutes = item.startTime ? timeToMinutes(item.startTime) : null;
            const endMinutes = itemEndMinutes(item);
            if (startMinutes === null || endMinutes === null) continue;
            const fitsOpeningRange = period.ranges.some((range) =>
                startMinutes >= timeToMinutes(range.open) && endMinutes <= timeToMinutes(range.close));
            if (!fitsOpeningRange) {
                throw new ApiError(422, 'VALIDATION_ERROR', 'Thời gian item nằm ngoài giờ mở cửa của Location.', {
                    locationId: item.locationId.toString(),
                    dayNumber: day.dayNumber,
                    dayOfWeek,
                    startTime: item.startTime,
                    endTime: item.endTime,
                });
            }
        }
    }
};

const assertActor = (actor: Actor) => {
    if (!mongoose.isValidObjectId(actor.id)) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không hợp lệ.');
};

const findOwnedItinerary = async (itineraryId: string, actor: Actor) => {
    assertActor(actor);
    if (!mongoose.isValidObjectId(itineraryId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Itinerary.');
    const itinerary = await Itinerary.findOne({ _id: itineraryId, ownerId: actor.id, isDeleted: false });
    if (!itinerary) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Itinerary.');
    return itinerary;
};

const daysFromDocument = (itinerary: IItinerary): ValidatedDay[] => itinerary.days.map((day) => ({
    dayNumber: day.dayNumber,
    items: day.items.map((item) => ({
        locationId: item.locationId,
        order: item.order,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: item.durationMinutes,
        note: item.note,
    })),
}));

const locationMapFor = async (itinerary: IItinerary) => {
    const ids = [...new Set(itinerary.days.flatMap((day) => day.items.map((item) => item.locationId.toString())))];
    const locations = await Location.find({ _id: { $in: ids } })
        .select({ name: 1, status: 1, address: 1, images: 1 })
        .lean();
    return new Map(locations.map((location) => [location._id.toString(), location]));
};

const toResponse = async (itinerary: IItinerary) => {
    const locations = await locationMapFor(itinerary);
    return {
        id: itinerary._id.toString(),
        title: itinerary.title,
        description: itinerary.description,
        startDate: itinerary.startDate,
        visibility: itinerary.visibility,
        status: itinerary.status,
        days: itinerary.days.map((day) => ({
            dayNumber: day.dayNumber,
            items: [...day.items].sort((left, right) => left.order - right.order).map((item) => {
                const location = locations.get(item.locationId.toString());
                const available = location?.status === 'approved';
                return {
                    id: item._id.toString(),
                    locationId: item.locationId.toString(),
                    order: item.order,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    durationMinutes: item.durationMinutes,
                    note: item.note,
                    availability: available ? 'available' : 'unavailable',
                    location: available ? {
                        id: location._id.toString(),
                        name: location.name,
                        formattedAddress: [location.address.addressLine, location.address.wardNameSnapshot].filter(Boolean).join(', '),
                        coverImageUrl: [...location.images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
                    } : null,
                };
            }),
        })),
        restoreRequest: itinerary.restoreRequest,
        moderation: itinerary.moderation,
        createdAt: itinerary.createdAt,
        updatedAt: itinerary.updatedAt,
    };
};

const toPublicResponse = async (
    itinerary: IItinerary,
    owner?: { _id: mongoose.Types.ObjectId; displayName: string; avatarUrl?: string },
) => {
    const { restoreRequest: _restoreRequest, moderation: _moderation, ...response } = await toResponse(itinerary);
    return {
        ...response,
        owner: owner ? {
            id: owner._id.toString(),
            displayName: owner.displayName,
            avatarUrl: owner.avatarUrl ?? null,
        } : null,
    };
};

const positiveInteger = (value: string | undefined, fallback: number, maximum?: number) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) validationError('Thông tin phân trang không hợp lệ.');
    return maximum ? Math.min(parsed, maximum) : parsed;
};

export const getPublicItineraries = async (query: PublicItineraryQuery) => {
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 12, 50);
    const approvedLocationIds = await Location.distinct('_id', { status: 'approved' });
    const filter = {
        visibility: 'public' as const,
        status: 'active' as const,
        isDeleted: false,
        'days.items.locationId': { $in: approvedLocationIds },
    };
    const [itineraries, total] = await Promise.all([
        Itinerary.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize),
        Itinerary.countDocuments(filter),
    ]);
    const ownerIds = [...new Set(itineraries.map((itinerary) => itinerary.ownerId.toString()))];
    const owners = await User.find({ _id: { $in: ownerIds } }).select({ displayName: 1, avatarUrl: 1 }).lean();
    const ownerMap = new Map(owners.map((owner) => [owner._id.toString(), owner]));
    return {
        data: await Promise.all(itineraries.map((itinerary) =>
            toPublicResponse(itinerary, ownerMap.get(itinerary.ownerId.toString())))),
        meta: { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) },
    };
};

export const getPublicItineraryById = async (itineraryId: string) => {
    if (!mongoose.isValidObjectId(itineraryId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Itinerary.');
    const itinerary = await Itinerary.findOne({
        _id: itineraryId,
        visibility: 'public',
        status: 'active',
        isDeleted: false,
    });
    if (!itinerary) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Itinerary.');
    const owner = await User.findById(itinerary.ownerId).select({ displayName: 1, avatarUrl: 1 }).lean();
    return toPublicResponse(itinerary, owner ?? undefined);
};

export const createItinerary = async (input: CreateItineraryInput, actor: Actor) => {
    assertActor(actor);
    assertPayload(input, CREATE_FIELDS, false);
    const title = requiredString(input.title, 'title', 200);
    const description = optionalText(input.description, 'description', 5000) ?? '';
    const startDate = input.startDate === undefined ? null : parseStartDate(input.startDate);
    const visibility = input.visibility === undefined ? 'private' : parseVisibility(input.visibility);
    const days = parseDays(input.days);
    await assertLocationsAndOpeningHours(days, startDate);
    const itinerary = await Itinerary.create({
        ownerId: actor.id,
        title,
        description,
        startDate,
        visibility,
        days,
    });
    return toResponse(itinerary);
};

export const getItineraries = async (actor: Actor) => {
    assertActor(actor);
    const itineraries = await Itinerary.find({ ownerId: actor.id, isDeleted: false }).sort({ updatedAt: -1 });
    return Promise.all(itineraries.map(toResponse));
};

export const getItineraryById = async (itineraryId: string, actor: Actor) =>
    toResponse(await findOwnedItinerary(itineraryId, actor));

export const updateItinerary = async (itineraryId: string, input: UpdateItineraryInput, actor: Actor) => {
    assertPayload(input, UPDATE_FIELDS, true);
    const itinerary = await findOwnedItinerary(itineraryId, actor);

    const nextTitle = input.title === undefined
        ? itinerary.title
        : requiredString(input.title, 'title', 200);
    const nextDescription = input.description === undefined
        ? itinerary.description
        : (optionalText(input.description, 'description', 5000) ?? '');
    const nextStartDate = input.startDate === undefined
        ? itinerary.startDate
        : parseStartDate(input.startDate);
    const nextVisibility = input.visibility === undefined
        ? itinerary.visibility
        : parseVisibility(input.visibility);
    const nextDays = input.days === undefined
        ? daysFromDocument(itinerary)
        : parseDays(input.days);

    await assertLocationsAndOpeningHours(nextDays, nextStartDate);

    itinerary.title = nextTitle;
    itinerary.description = nextDescription;
    itinerary.startDate = nextStartDate;
    itinerary.visibility = nextVisibility;
    if (input.days !== undefined) itinerary.set('days', nextDays);
    await itinerary.save();
    return toResponse(itinerary);
};

export const deleteItinerary = async (itineraryId: string, actor: Actor) => {
    const itinerary = await findOwnedItinerary(itineraryId, actor);
    itinerary.isDeleted = true;
    itinerary.deletedAt = new Date();
    await itinerary.save();
};

export const copyPublicItinerary = async (itineraryId: string, actor: Actor) => {
    assertActor(actor);
    if (!mongoose.isValidObjectId(itineraryId)) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Itinerary.');
    const source = await Itinerary.findOne({
        _id: itineraryId,
        visibility: 'public',
        status: 'active',
        isDeleted: false,
    });
    if (!source) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Itinerary.');

    const locationIds = [...new Set(source.days.flatMap((day) =>
        day.items.map((item) => item.locationId.toString())))];
    const approvedLocations = await Location.find({
        _id: { $in: locationIds },
        status: 'approved',
    }).select({ _id: 1 }).lean();
    const approvedIds = new Set(approvedLocations.map((location) => location._id.toString()));
    const days: ValidatedDay[] = source.days
        .map((day) => ({
            dayNumber: day.dayNumber,
            items: [...day.items]
                .sort((left, right) => left.order - right.order)
                .filter((item) => approvedIds.has(item.locationId.toString()))
                .map((item, index) => ({
                    locationId: item.locationId,
                    order: index + 1,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    durationMinutes: item.durationMinutes,
                    note: item.note,
                })),
        }))
        .filter((day) => day.items.length > 0)
        .map((day, index) => ({ ...day, dayNumber: index + 1 }));

    if (days.length === 0) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Lịch trình không còn Location khả dụng để sao chép.');
    }
    await assertLocationsAndOpeningHours(days, source.startDate);
    const copy = await Itinerary.create({
        ownerId: actor.id,
        title: `${source.title.slice(0, 188)} (Bản sao)`,
        description: source.description,
        startDate: source.startDate,
        visibility: 'private',
        status: 'active',
        days,
    });
    return toResponse(copy);
};
