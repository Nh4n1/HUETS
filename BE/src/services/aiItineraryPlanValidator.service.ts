import type { AiItineraryRequest, AiPlan } from '../schemas/aiItinerary.schema.ts';
import type { PlanningIssue, ScheduleLocationLike } from './itineraryScheduleValidator.service.ts';
import { validateItinerarySchedule } from './itineraryScheduleValidator.service.ts';

const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export const validateAiPlan = ({
    plan,
    request,
    candidateLocationIds,
    locationsById,
}: {
    plan: AiPlan;
    request: AiItineraryRequest;
    candidateLocationIds: Set<string>;
    locationsById: Map<string, ScheduleLocationLike>;
}) => {
    const issues: PlanningIssue[] = [];
    if (plan.days.length !== request.durationDays) {
        issues.push({
            level: 'error', code: 'TECHNICAL_LIMIT_EXCEEDED',
            message: `AI phải tạo đúng ${request.durationDays} ngày.`,
        });
    }
    const expectedDays = Array.from({ length: request.durationDays }, (_, index) => index + 1);
    const actualDays = plan.days.map(({ dayNumber }) => dayNumber).sort((left, right) => left - right);
    if (JSON.stringify(expectedDays) !== JSON.stringify(actualDays)) {
        issues.push({
            level: 'error', code: 'TECHNICAL_LIMIT_EXCEEDED',
            message: 'dayNumber trong AI plan phải liên tục từ 1.',
        });
    }

    const allItems = plan.days.flatMap((day) => day.items.map((item) => ({ ...item, dayNumber: day.dayNumber })));
    for (const day of plan.days) {
        if (day.items.length === 0) {
            issues.push({
                level: 'error', code: 'TECHNICAL_LIMIT_EXCEEDED', dayNumber: day.dayNumber,
                message: `Ngày ${day.dayNumber} cần có ít nhất một địa điểm.`,
            });
        }
    }
    const seen = new Set<string>();
    for (const item of allItems) {
        if (!candidateLocationIds.has(item.locationId)) {
            issues.push({
                level: 'error', code: 'LOCATION_UNAVAILABLE', locationId: item.locationId,
                dayNumber: item.dayNumber, message: 'AI đã trả về địa điểm ngoài candidate set.',
            });
        }
        if (seen.has(item.locationId)) {
            issues.push({
                level: 'error', code: 'TECHNICAL_LIMIT_EXCEEDED', locationId: item.locationId,
                dayNumber: item.dayNumber, message: 'Một địa điểm không được xuất hiện nhiều lần trong AI plan.',
            });
        }
        seen.add(item.locationId);
    }
    for (const locationId of request.mustVisitLocationIds) {
        if (!seen.has(locationId)) {
            issues.push({
                level: 'error', code: 'MUST_VISIT_NOT_SCHEDULED', locationId,
                message: 'AI không được bỏ địa điểm Must Visit.',
            });
        }
    }

    for (const day of plan.days) {
        const ordered = [...day.items].sort((left, right) =>
            minutes(left.suggestedStartTime) - minutes(right.suggestedStartTime));
        for (let index = 1; index < ordered.length; index += 1) {
            const previous = ordered[index - 1];
            const current = ordered[index];
            if (previous && current
                && minutes(current.suggestedStartTime)
                    < minutes(previous.suggestedStartTime) + previous.durationMinutes) {
                issues.push({
                    level: 'error', code: 'DAILY_TIME_CONFLICT', dayNumber: day.dayNumber,
                    locationId: current.locationId, message: 'Các địa điểm trong AI plan bị chồng lấn thời gian.',
                });
            }
        }
    }

    const schedule = validateItinerarySchedule({
        days: plan.days.map((day) => ({
            dayNumber: day.dayNumber,
            items: day.items.map((item) => ({
                locationId: item.locationId,
                startTime: item.suggestedStartTime,
                durationMinutes: item.durationMinutes,
            })),
        })),
        locationsById,
        startDate: request.startDate ? new Date(`${request.startDate}T00:00:00.000Z`) : null,
        dailyTimeRange: request.dailyTimeRange,
    });
    issues.push(...schedule.issues);
    return {
        status: issues.some(({ level }) => level === 'error') ? 'conflict' as const
            : issues.length > 0 ? 'unknown' as const : 'valid' as const,
        issues,
    };
};
