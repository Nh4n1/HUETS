import Location, { type ILocation } from '../models/location.model.ts';
import { AI_ITINERARY_CONSTANTS } from '../config/aiItinerary.config.ts';
import type { NormalizedPreferences } from './aiItineraryPreferenceParser.service.ts';
import mongoose from 'mongoose';

export interface CandidateRetrievalOptions {
    preferences: NormalizedPreferences;
    mustVisitLocationIds?: string[];
    maxCandidates?: number;
}

export class CandidateRetrievalService {
    static async retrieveCandidates(options: CandidateRetrievalOptions): Promise<ILocation[]> {
        const { preferences, mustVisitLocationIds = [], maxCandidates = AI_ITINERARY_CONSTANTS.MAX_CANDIDATES } = options;

        const mustVisitObjectIds = mustVisitLocationIds
            .filter((id) => mongoose.isValidObjectId(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const mustVisitLocations: ILocation[] = mustVisitObjectIds.length > 0
            ? await Location.find({ _id: { $in: mustVisitObjectIds }, status: 'approved' })
            : [];

        const mustVisitSet = new Set(mustVisitLocations.map((loc) => loc._id.toString()));

        const queryFilter: Record<string, unknown> = {
            status: 'approved',
            _id: { $nin: Array.from(mustVisitSet).map((id) => new mongoose.Types.ObjectId(id)) },
        };

        if (preferences.categoryCodes.length > 0) {
            queryFilter.categoryCode = { $in: preferences.categoryCodes };
        }

        if (preferences.requiredTagCodes.length > 0) {
            queryFilter.tagCodes = { $all: preferences.requiredTagCodes };
        }

        if (preferences.avoidTagCodes.length > 0) {
            queryFilter.tagCodes = { ...(queryFilter.tagCodes as object || {}), $nin: preferences.avoidTagCodes };
        }

        const remainingLimit = Math.max(0, maxCandidates - mustVisitLocations.length);

        const filteredCandidates: ILocation[] = remainingLimit > 0
            ? await Location.find(queryFilter).limit(remainingLimit).sort({ 'ratingSummary.average': -1 })
            : [];

        return [...mustVisitLocations, ...filteredCandidates];
    }
}
