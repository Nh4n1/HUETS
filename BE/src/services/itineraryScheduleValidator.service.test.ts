import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { validateItineraryItemSchedule } from './itineraryScheduleValidator.service.ts';

const locationId = new Types.ObjectId().toString();
const scheduledLocation = {
    _id: locationId,
    name: 'Đại Nội',
    status: 'approved',
    isDeleted: false,
    openingHours: {
        status: 'scheduled' as const,
        periods: [{ dayOfWeek: 1, ranges: [{ open: '06:00', close: '10:00' }] }],
    },
};

const validate = (startTime: string, durationMinutes: number) => validateItineraryItemSchedule({
    item: { locationId, startTime, durationMinutes },
    location: scheduledLocation,
    startDate: new Date('2026-08-10T00:00:00.000Z'),
    dayNumber: 1,
});

describe('itinerary schedule validator', () => {
    it('accepts an item fully contained in an opening range', () => {
        expect(validate('08:00', 60)).toEqual({ status: 'valid', issues: [] });
    });

    it('rejects an item scheduled outside opening hours', () => {
        expect(validate('19:00', 60)).toMatchObject({
            status: 'conflict',
            issues: [{ level: 'error', code: 'OUTSIDE_OPENING_HOURS' }],
        });
    });

    it('includes duration when checking the closing time', () => {
        expect(validate('09:30', 60).issues[0]).toMatchObject({ code: 'OUTSIDE_OPENING_HOURS' });
        expect(validate('09:30', 30)).toEqual({ status: 'valid', issues: [] });
    });

    it('returns a warning rather than treating unknown hours as closed', () => {
        const result = validateItineraryItemSchedule({
            item: { locationId, startTime: '09:00', durationMinutes: 60 },
            location: { ...scheduledLocation, openingHours: { status: 'unknown', periods: [] } },
            startDate: null,
            dayNumber: 1,
        });
        expect(result).toMatchObject({
            status: 'unknown',
            issues: [{ level: 'warning', code: 'OPENING_HOURS_UNKNOWN' }],
        });
    });

    it('warns when scheduled hours cannot be matched without a trip date', () => {
        const result = validateItineraryItemSchedule({
            item: { locationId, startTime: '09:00', durationMinutes: 60 },
            location: scheduledLocation,
            startDate: null,
            dayNumber: 1,
        });
        expect(result.issues[0]).toMatchObject({ level: 'warning', code: 'TRIP_DATE_UNKNOWN' });
    });
});
