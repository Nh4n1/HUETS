import { MAX_ITEMS_PER_DAY, MAX_ITINERARY_DAYS } from '../models/itinerary.model.ts';

export type PlanningIssueLevel = 'error' | 'warning';
export type ScheduleValidationStatus = 'valid' | 'conflict' | 'unknown';

export interface PlanningIssue {
    level: PlanningIssueLevel;
    code:
        | 'LOCATION_UNAVAILABLE'
        | 'OUTSIDE_OPENING_HOURS'
        | 'CLOSED_ON_TRIP_DAY'
        | 'OPENING_HOURS_UNKNOWN'
        | 'TRIP_DATE_UNKNOWN'
        | 'DAILY_TIME_CONFLICT'
        | 'MUST_VISIT_NOT_SCHEDULED'
        | 'MUST_VISIT_TIME_CONFLICT'
        | 'TECHNICAL_LIMIT_EXCEEDED';
    locationId?: string;
    dayNumber?: number;
    itemId?: string;
    message: string;
}

export interface ScheduleItemLike {
    locationId: { toString(): string } | string;
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number | null;
    _id?: { toString(): string } | string;
}

export interface ScheduleDayLike {
    dayNumber: number;
    items: ScheduleItemLike[];
}

export interface ScheduleLocationLike {
    _id: { toString(): string } | string;
    name?: string;
    status?: string;
    isDeleted?: boolean;
    openingHours?: {
        status: 'unknown' | 'always_open' | 'scheduled';
        periods?: Array<{
            dayOfWeek: number;
            ranges: Array<{ open: string; close: string }>;
        }>;
    };
}

export interface DailyTimeRange {
    start: string;
    end: string;
}

export interface ScheduleValidationResult {
    status: ScheduleValidationStatus;
    issues: PlanningIssue[];
}

const timeToMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

const itemEndMinutes = (item: ScheduleItemLike) => {
    if (item.endTime) return timeToMinutes(item.endTime);
    if (item.startTime && item.durationMinutes) return timeToMinutes(item.startTime) + item.durationMinutes;
    return null;
};

export const itineraryDayOfWeek = (startDate: Date, dayNumber: number) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayNumber - 1);
    const sundayBasedDay = date.getUTCDay();
    return sundayBasedDay === 0 ? 7 : sundayBasedDay;
};

const resultFromIssues = (issues: PlanningIssue[]): ScheduleValidationResult => ({
    status: issues.some(({ level }) => level === 'error')
        ? 'conflict'
        : issues.length > 0 ? 'unknown' : 'valid',
    issues,
});

export const validateItineraryItemSchedule = ({
    item,
    location,
    startDate,
    dayNumber,
    dailyTimeRange,
}: {
    item: ScheduleItemLike;
    location?: ScheduleLocationLike | undefined;
    startDate?: Date | null | undefined;
    dayNumber: number;
    dailyTimeRange?: DailyTimeRange | null | undefined;
}): ScheduleValidationResult => {
    const locationId = item.locationId.toString();
    const itemId = item._id?.toString();
    const issues: PlanningIssue[] = [];
    const base = { locationId, dayNumber, ...(itemId ? { itemId } : {}) };

    if (!location || location.status !== 'approved' || location.isDeleted === true) {
        return resultFromIssues([{
            ...base,
            level: 'error',
            code: 'LOCATION_UNAVAILABLE',
            message: 'Địa điểm không tồn tại hoặc hiện không khả dụng.',
        }]);
    }

    const startMinutes = item.startTime ? timeToMinutes(item.startTime) : null;
    const endMinutes = itemEndMinutes(item);
    if (dailyTimeRange && startMinutes !== null && endMinutes !== null
        && (startMinutes < timeToMinutes(dailyTimeRange.start) || endMinutes > timeToMinutes(dailyTimeRange.end))) {
        issues.push({
            ...base,
            level: 'error',
            code: 'DAILY_TIME_CONFLICT',
            message: `Thời gian phải nằm trong khung ${dailyTimeRange.start}–${dailyTimeRange.end}.`,
        });
    }

    const openingHours = location.openingHours;
    if (!openingHours || openingHours.status === 'unknown') {
        issues.push({
            ...base,
            level: 'warning',
            code: 'OPENING_HOURS_UNKNOWN',
            message: 'Chưa xác minh giờ hoạt động của địa điểm.',
        });
        return resultFromIssues(issues);
    }
    if (openingHours.status === 'always_open') return resultFromIssues(issues);
    if (!startDate) {
        issues.push({
            ...base,
            level: 'warning',
            code: 'TRIP_DATE_UNKNOWN',
            message: 'Chọn ngày bắt đầu để kiểm tra chính xác giờ hoạt động.',
        });
        return resultFromIssues(issues);
    }

    const dayOfWeek = itineraryDayOfWeek(startDate, dayNumber);
    const period = openingHours.periods?.find((candidate) => candidate.dayOfWeek === dayOfWeek);
    if (!period || period.ranges.length === 0) {
        issues.push({
            ...base,
            level: 'error',
            code: 'CLOSED_ON_TRIP_DAY',
            message: `${location.name ?? 'Địa điểm'} đóng cửa vào ngày đã chọn.`,
        });
        return resultFromIssues(issues);
    }

    if (startMinutes !== null && endMinutes !== null) {
        const matchingRange = period.ranges.find((range) =>
            startMinutes >= timeToMinutes(range.open) && endMinutes <= timeToMinutes(range.close));
        if (!matchingRange) {
            const hours = period.ranges.map(({ open, close }) => `${open}–${close}`).join(', ');
            issues.push({
                ...base,
                level: 'error',
                code: 'OUTSIDE_OPENING_HOURS',
                message: `${location.name ?? 'Địa điểm'} chỉ mở ${hours}.`,
            });
        }
    }
    return resultFromIssues(issues);
};

export const validateItinerarySchedule = ({
    days,
    locationsById,
    startDate,
    dailyTimeRange,
}: {
    days: ScheduleDayLike[];
    locationsById: Map<string, ScheduleLocationLike>;
    startDate?: Date | null;
    dailyTimeRange?: DailyTimeRange | null;
}): ScheduleValidationResult => {
    const issues: PlanningIssue[] = [];
    if (days.length > MAX_ITINERARY_DAYS) {
        issues.push({
            level: 'error',
            code: 'TECHNICAL_LIMIT_EXCEEDED',
            message: `Lịch trình không được vượt quá ${MAX_ITINERARY_DAYS} ngày.`,
        });
    }
    for (const day of days) {
        if (day.items.length > MAX_ITEMS_PER_DAY) {
            issues.push({
                level: 'error',
                code: 'TECHNICAL_LIMIT_EXCEEDED',
                dayNumber: day.dayNumber,
                message: `Mỗi ngày không được vượt quá ${MAX_ITEMS_PER_DAY} địa điểm.`,
            });
        }
        for (const item of day.items) {
            issues.push(...validateItineraryItemSchedule({
                item,
                location: locationsById.get(item.locationId.toString()),
                startDate,
                dayNumber: day.dayNumber,
                dailyTimeRange,
            }).issues);
        }
    }
    return resultFromIssues(issues);
};
