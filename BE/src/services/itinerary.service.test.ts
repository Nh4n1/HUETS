import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import User from '../models/user.model.ts';
import * as itineraryService from './itinerary.service.ts';

const actor = { id: new Types.ObjectId().toString(), role: 'user' as const };
const locationId = new Types.ObjectId();

const approvedLocationQuery = (locations: Array<Record<string, unknown>>) => ({
    select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(locations) }),
});

const itineraryDocument = () => new Itinerary({
    _id: new Types.ObjectId(),
    ownerId: actor.id,
    title: 'Một ngày ở Huế',
    description: '',
    days: [{
        dayNumber: 1,
        items: [{ locationId, order: 1, startTime: '08:00', endTime: '10:00' }],
    }],
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('Itinerary service', () => {
    afterEach(() => vi.restoreAllMocks());

    it('rejects create when a referenced Location no longer exists', async () => {
        vi.spyOn(Location, 'find').mockReturnValue(approvedLocationQuery([]) as never);

        await expect(itineraryService.createItinerary({
            title: 'Một ngày ở Huế',
            days: [{ dayNumber: 1, items: [{ locationId: locationId.toString(), order: 1 }] }],
        }, actor)).rejects.toMatchObject({
            statusCode: 422,
            details: { missingLocationIds: [locationId.toString()] },
        });
    });

    it('rejects create when a referenced Location is not approved', async () => {
        vi.spyOn(Location, 'find').mockReturnValue(approvedLocationQuery([{
            _id: locationId,
            status: 'hidden',
            openingHours: { status: 'unknown', periods: [] },
        }]) as never);

        await expect(itineraryService.createItinerary({
            title: 'Một ngày ở Huế',
            days: [{ dayNumber: 1, items: [{ locationId: locationId.toString(), order: 1 }] }],
        }, actor)).rejects.toMatchObject({
            statusCode: 422,
            details: { unapprovedLocationIds: [locationId.toString()] },
        });
    });

    it('rejects duplicate Locations in the same day', async () => {
        await expect(itineraryService.createItinerary({
            title: 'Một ngày ở Huế',
            days: [{
                dayNumber: 1,
                items: [
                    { locationId: locationId.toString(), order: 1 },
                    { locationId: locationId.toString(), order: 2 },
                ],
            }],
        }, actor)).rejects.toThrow('Một Location không được xuất hiện nhiều lần trong ngày 1.');
    });

    it('rejects overlapping item times', async () => {
        await expect(itineraryService.createItinerary({
            title: 'Một ngày ở Huế',
            days: [{
                dayNumber: 1,
                items: [
                    { locationId: locationId.toString(), order: 1, startTime: '08:00', endTime: '10:00' },
                    { locationId: new Types.ObjectId().toString(), order: 2, startTime: '09:30', endTime: '11:00' },
                ],
            }],
        }, actor)).rejects.toThrow('Các item ngày 1 không được chồng lấn thời gian.');
    });

    it('rejects a scheduled Location outside its opening hours', async () => {
        vi.spyOn(Location, 'find').mockReturnValue(approvedLocationQuery([{
            _id: locationId,
            status: 'approved',
            openingHours: {
                status: 'scheduled',
                periods: [{ dayOfWeek: 1, ranges: [{ open: '08:00', close: '17:00' }] }],
            },
        }]) as never);

        await expect(itineraryService.createItinerary({
            title: 'Một ngày ở Huế',
            startDate: '2026-08-10',
            days: [{
                dayNumber: 1,
                items: [{ locationId: locationId.toString(), order: 1, startTime: '18:00', endTime: '19:00' }],
            }],
        }, actor)).rejects.toMatchObject({
            statusCode: 422,
            details: { locationId: locationId.toString(), dayNumber: 1, dayOfWeek: 1 },
        });
    });

    it('always scopes detail lookup to the owner and non-deleted records', async () => {
        const itinerary = itineraryDocument();
        const findOne = vi.spyOn(Itinerary, 'findOne').mockResolvedValue(itinerary);
        vi.spyOn(Location, 'find').mockReturnValue(approvedLocationQuery([]) as never);

        await itineraryService.getItineraryById(itinerary._id.toString(), actor);

        expect(findOne).toHaveBeenCalledWith({
            _id: itinerary._id.toString(),
            ownerId: actor.id,
            isDeleted: false,
        });
    });

    it('keeps an item but marks it unavailable when its Location is no longer approved', async () => {
        const itinerary = itineraryDocument();
        vi.spyOn(Itinerary, 'findOne').mockResolvedValue(itinerary);
        vi.spyOn(Location, 'find').mockReturnValue(approvedLocationQuery([{
            _id: locationId,
            name: 'Địa điểm đã ẩn',
            status: 'hidden',
            address: { addressLine: 'Huế', wardNameSnapshot: 'Phường Thuận Hóa' },
            images: [],
        }]) as never);

        const result = await itineraryService.getItineraryById(itinerary._id.toString(), actor);

        expect(result.days[0]?.items[0]).toMatchObject({
            locationId: locationId.toString(),
            availability: 'unavailable',
            location: null,
        });
    });

    it('only returns a public, active and non-deleted itinerary to community viewers', async () => {
        const itinerary = itineraryDocument();
        itinerary.visibility = 'public';
        const findOne = vi.spyOn(Itinerary, 'findOne').mockResolvedValue(itinerary);
        vi.spyOn(User, 'findById').mockReturnValue({
            select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
        } as never);
        vi.spyOn(Location, 'find').mockReturnValue(approvedLocationQuery([]) as never);

        await itineraryService.getPublicItineraryById(itinerary._id.toString());

        expect(findOne).toHaveBeenCalledWith({
            _id: itinerary._id.toString(),
            visibility: 'public',
            status: 'active',
            isDeleted: false,
        });
    });
});
