import Location, { type ILocation } from '../models/location.model.ts';
import { TravelEstimateService } from './aiItineraryTravelEstimate.service.ts';
import mongoose from 'mongoose';

export interface LocationAlternativeResult {
    location: ILocation;
    distanceFromTargetKm: number;
    reason: string;
}

export class AIItineraryAlternativesService {
    static async findAlternatives(
        targetLocation: ILocation,
        excludeLocationIds: string[] = [],
        limit: number = 5,
    ): Promise<LocationAlternativeResult[]> {
        const excludeSet = new Set([targetLocation._id.toString(), ...excludeLocationIds]);
        const excludeObjectIds = Array.from(excludeSet)
            .filter((id) => mongoose.isValidObjectId(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const candidates = await Location.find({
            status: 'approved',
            categoryCode: targetLocation.categoryCode,
            _id: { $nin: excludeObjectIds },
        })
            .limit(limit * 2)
            .sort({ 'ratingSummary.average': -1 });

        const targetCoords: [number, number] = [
            targetLocation.geo.coordinates[0],
            targetLocation.geo.coordinates[1],
        ];

        const results: LocationAlternativeResult[] = candidates.map((location) => {
            const locCoords: [number, number] = [
                location.geo.coordinates[0],
                location.geo.coordinates[1],
            ];
            const distanceKm = TravelEstimateService.calculateHaversineDistanceKm(targetCoords, locCoords);

            return {
                location,
                distanceFromTargetKm: distanceKm,
                reason: `Cùng danh mục "${targetLocation.categoryCode}" cách khoảng ${distanceKm}km`,
            };
        });

        results.sort((a, b) => a.distanceFromTargetKm - b.distanceFromTargetKm);
        return results.slice(0, limit);
    }
}
