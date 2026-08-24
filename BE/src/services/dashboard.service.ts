import Itinerary from '../models/itinerary.model.ts';
import Location from '../models/location.model.ts';
import LocationReview from '../models/locationReview.model.ts';
import type { UserRole } from '../models/user.model.ts';
import { categories } from '../reference/reference.data.ts';
import { getAdminUserStats } from './user.service.ts';

const PENDING_OVERDUE_HOURS = 48;
const PENDING_PREVIEW_LIMIT = 5;
const TOP_RATED_LOCATION_LIMIT = 5;
const categoryNames = new Map(categories.map((category) => [category.code, category.name]));

interface StatusCount {
    _id: string;
    count: number;
}

const countFor = (rows: StatusCount[], status: string) =>
    rows.find((row) => row._id === status)?.count ?? 0;

export const getDashboard = async (role: UserRole) => {
    const overdueCutoff = new Date(Date.now() - PENDING_OVERDUE_HOURS * 60 * 60 * 1000);
    const pendingFilter = { status: 'pending' as const, isDeleted: { $ne: true } };

    const [locationCounts, reviewCounts, itineraryCounts, overduePending, oldestPending, topRated, users] = await Promise.all([
        Location.aggregate<StatusCount>([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        LocationReview.aggregate<StatusCount>([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Itinerary.aggregate<StatusCount>([
            { $match: { visibility: 'public', isDeleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Location.countDocuments({
            ...pendingFilter,
            $or: [
                { 'moderation.submittedAt': { $lt: overdueCutoff } },
                { 'moderation.submittedAt': null, createdAt: { $lt: overdueCutoff } },
            ],
        }),
        Location.find(pendingFilter)
            .select({
                name: 1,
                categoryCode: 1,
                'address.wardNameSnapshot': 1,
                'moderation.submittedAt': 1,
                createdAt: 1,
            })
            .sort({ 'moderation.submittedAt': 1, createdAt: 1 })
            .limit(PENDING_PREVIEW_LIMIT)
            .lean(),
        Location.find({
            status: 'approved',
            isDeleted: { $ne: true },
            'ratingSummary.count': { $gt: 0 },
        })
            .select({
                name: 1,
                categoryCode: 1,
                'address.wardNameSnapshot': 1,
                images: 1,
                ratingSummary: 1,
            })
            .sort({ 'ratingSummary.average': -1, 'ratingSummary.count': -1, _id: 1 })
            .limit(TOP_RATED_LOCATION_LIMIT)
            .lean(),
        role === 'admin' ? getAdminUserStats() : Promise.resolve(null),
    ]);

    return {
        role,
        generatedAt: new Date(),
        locations: {
            pending: countFor(locationCounts, 'pending'),
            approved: countFor(locationCounts, 'approved'),
            hidden: countFor(locationCounts, 'hidden'),
            rejected: countFor(locationCounts, 'rejected'),
            withdrawn: countFor(locationCounts, 'withdrawn'),
            overduePending,
            overdueThresholdHours: PENDING_OVERDUE_HOURS,
            oldestPending: oldestPending.map((location) => ({
                id: location._id.toString(),
                name: location.name,
                categoryCode: location.categoryCode,
                categoryName: categoryNames.get(location.categoryCode) ?? location.categoryCode,
                wardName: location.address.wardNameSnapshot,
                submittedAt: location.moderation.submittedAt ?? location.createdAt,
            })),
            topRated: topRated.map((location) => ({
                id: location._id.toString(),
                name: location.name,
                categoryCode: location.categoryCode,
                categoryName: categoryNames.get(location.categoryCode) ?? location.categoryCode,
                wardName: location.address.wardNameSnapshot,
                coverImageUrl: [...location.images]
                    .sort((left, right) => left.position - right.position)[0]?.url ?? null,
                averageRating: location.ratingSummary.average,
                reviewCount: location.ratingSummary.count,
            })),
        },
        reviews: {
            active: countFor(reviewCounts, 'active'),
            hidden: countFor(reviewCounts, 'hidden'),
            deleted: countFor(reviewCounts, 'deleted'),
        },
        itineraries: {
            active: countFor(itineraryCounts, 'active'),
            hidden: countFor(itineraryCounts, 'hidden'),
        },
        users,
    };
};
