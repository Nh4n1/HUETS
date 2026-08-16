import type { ILocation } from '../models/location.model.ts';
import type { NormalizedPreferences } from './aiItineraryPreferenceParser.service.ts';
import { TravelEstimateService } from './aiItineraryTravelEstimate.service.ts';

export interface RankedCandidate {
    location: ILocation;
    score: number;
    isMustVisit: boolean;
    distanceFromOriginKm: number;
}

export interface RankingOptions {
    candidates: ILocation[];
    preferences: NormalizedPreferences;
    mustVisitLocationIds?: string[];
    originCoordinates: [number, number];
}

export class CandidateRankingService {
    static rank(options: RankingOptions): RankedCandidate[] {
        const { candidates, preferences, mustVisitLocationIds = [], originCoordinates } = options;
        const mustVisitSet = new Set(mustVisitLocationIds);

        const ranked = candidates.map((location) => {
            const locId = location._id.toString();
            const isMustVisit = mustVisitSet.has(locId);
            let score = 0;

            if (isMustVisit) {
                score += 1000;
            }

            if (preferences.categoryCodes.includes(location.categoryCode)) {
                score += 30;
            }

            const preferredTagMatches = location.tagCodes.filter((tag) =>
                preferences.preferredTagCodes.includes(tag),
            ).length;
            score += preferredTagMatches * 15;

            score += (location.ratingSummary?.average || 0) * 10;

            const locCoords: [number, number] = [
                location.geo.coordinates[0],
                location.geo.coordinates[1],
            ];
            const distanceFromOriginKm = TravelEstimateService.calculateHaversineDistanceKm(
                originCoordinates,
                locCoords,
            );

            const proximityBonus = Math.max(0, 20 - distanceFromOriginKm * 2);
            score += proximityBonus;

            return {
                location,
                score: Math.round(score * 100) / 100,
                isMustVisit,
                distanceFromOriginKm,
            };
        });

        return ranked.sort((a, b) => b.score - a.score);
    }
}
