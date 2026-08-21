import mongoose from 'mongoose';
import config from '../../config/config.db.ts';
import Location from '../../models/location.model.ts';
import LocationReview from '../../models/locationReview.model.ts';

const emptySummary = {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

await mongoose.connect(config.mongo.uri);

try {
    const backfillResult = await LocationReview.updateMany(
        { status: { $exists: false } },
        {
            $set: {
                status: 'active',
                editedAt: null,
                editCount: 0,
                deletedAt: null,
                hiddenAt: null,
                hiddenBy: null,
                hiddenReason: null,
            },
        },
    );

    const grouped = await LocationReview.aggregate<{
        _id: { locationId: mongoose.Types.ObjectId; rating: number };
        count: number;
    }>([
        { $match: { status: 'active' } },
        { $group: { _id: { locationId: '$locationId', rating: '$rating' }, count: { $sum: 1 } } },
    ]);

    const summaries = new Map<string, typeof emptySummary>();
    for (const row of grouped) {
        const key = row._id.locationId.toString();
        const summary = summaries.get(key) ?? {
            average: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
        if (row._id.rating >= 1 && row._id.rating <= 5) {
            summary.distribution[row._id.rating as keyof typeof summary.distribution] = row.count;
        }
        summaries.set(key, summary);
    }

    await Location.updateMany({}, { $set: { ratingSummary: emptySummary } });
    if (summaries.size > 0) {
        await Location.bulkWrite([...summaries.entries()].map(([locationId, summary]) => {
            summary.count = Object.values(summary.distribution).reduce((total, amount) => total + amount, 0);
            const score = Object.entries(summary.distribution)
                .reduce((total, [rating, amount]) => total + Number(rating) * amount, 0);
            summary.average = summary.count === 0 ? 0 : Math.round((score / summary.count) * 10) / 10;
            return {
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(locationId) },
                    update: { $set: { ratingSummary: summary } },
                },
            };
        }));
    }

    console.log(`Backfilled ${backfillResult.modifiedCount} reviews and recalculated ${summaries.size} locations.`);
} finally {
    await mongoose.disconnect();
}
