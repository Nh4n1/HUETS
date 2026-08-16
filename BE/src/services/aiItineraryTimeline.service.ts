import type { ILocation, IOpeningPeriod, IOpeningRange } from '../models/location.model.ts';
import { TravelEstimateService } from './aiItineraryTravelEstimate.service.ts';
import { PlanningProfileService } from './aiItineraryPlanningProfile.service.ts';

export interface TimelineItemInput {
    location: ILocation;
    suggestedStartTime?: string;
    durationMinutes?: number;
    note?: string;
}

export interface CalculatedTimelineItem {
    locationId: string;
    locationName: string;
    suggestedStartTime: string;
    suggestedEndTime: string;
    durationMinutes: number;
    estimatedTravelMinutes: number;
    note: string;
}

export interface TimelineCalculationResult {
    dayNumber: number;
    items: CalculatedTimelineItem[];
    warnings: string[];
}

export class TimelineService {
    static timeToMinutes(timeStr: string): number {
        const [hStr, mStr] = timeStr.split(':');
        const h = Number(hStr ?? 0);
        const m = Number(mStr ?? 0);
        return h * 60 + m;
    }

    static minutesToTime(totalMinutes: number): string {
        const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
        const h = Math.floor(normalized / 60);
        const m = normalized % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    static calculateDayTimeline(
        dayNumber: number,
        itemsInput: TimelineItemInput[],
        startCoordinates: [number, number],
        dailyTimeRange: { start: string; end: string },
        transportMode: string = 'motorcycle',
        dayOfWeek?: number,
    ): TimelineCalculationResult {
        const warnings: string[] = [];
        const items: CalculatedTimelineItem[] = [];

        let currentMinutes = this.timeToMinutes(dailyTimeRange.start);
        const dayEndMinutes = this.timeToMinutes(dailyTimeRange.end);
        let previousCoords = startCoordinates;

        for (let i = 0; i < itemsInput.length; i++) {
            const itemInput = itemsInput[i];
            if (!itemInput) continue;

            const { location, suggestedStartTime, durationMinutes, note = '' } = itemInput;
            const locId = location._id.toString();
            const locCoords: [number, number] = [
                location.geo.coordinates[0],
                location.geo.coordinates[1],
            ];

            const travelMins = TravelEstimateService.estimateTravelMinutes(
                previousCoords,
                locCoords,
                transportMode,
            );

            currentMinutes += travelMins;

            let startTimeMins = currentMinutes;
            if (suggestedStartTime) {
                const requestedMins = this.timeToMinutes(suggestedStartTime);
                if (requestedMins >= currentMinutes) {
                    startTimeMins = requestedMins;
                }
            }

            const visitDuration = durationMinutes || PlanningProfileService.getRecommendedVisitMinutes(location);
            const endTimeMins = startTimeMins + visitDuration;

            const startTimeStr = this.minutesToTime(startTimeMins);
            const endTimeStr = this.minutesToTime(endTimeMins);

            if (endTimeMins > dayEndMinutes) {
                warnings.push(
                    `Ngày ${dayNumber}: "${location.name}" kết thúc lúc ${endTimeStr}, vượt quá khung giờ trong ngày (${dailyTimeRange.end}).`,
                );
            }

            if (dayOfWeek && location.openingHours?.status === 'scheduled') {
                const period = location.openingHours.periods.find((p: IOpeningPeriod) => p.dayOfWeek === dayOfWeek);
                if (!period || period.ranges.length === 0) {
                    warnings.push(`Ngày ${dayNumber}: "${location.name}" có thể đóng cửa vào ngày này.`);
                } else {
                    const isOpen = period.ranges.some((r: IOpeningRange) => {
                        const openMins = this.timeToMinutes(r.open);
                        const closeMins = this.timeToMinutes(r.close);
                        return startTimeMins >= openMins && endTimeMins <= closeMins;
                    });

                    if (!isOpen) {
                        warnings.push(
                            `Ngày ${dayNumber}: Thời gian ghé thăm "${location.name}" (${startTimeStr} - ${endTimeStr}) nằm ngoài giờ mở cửa.`,
                        );
                    }
                }
            }

            items.push({
                locationId: locId,
                locationName: location.name,
                suggestedStartTime: startTimeStr,
                suggestedEndTime: endTimeStr,
                durationMinutes: visitDuration,
                estimatedTravelMinutes: travelMins,
                note,
            });

            currentMinutes = endTimeMins;
            previousCoords = locCoords;
        }

        return {
            dayNumber,
            items,
            warnings,
        };
    }
}
