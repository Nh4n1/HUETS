import Location from '../models/location.model.ts';
import type { OriginInput } from '../schemas/aiItinerary.schema.ts';

export const HUE_CITY_CENTER_COORDINATES: [number, number] = [107.5905, 16.4637];

export interface ResolvedOrigin {
    type: 'current_location' | 'map_point' | 'location_reference';
    coordinates: [number, number];
    locationId?: string;
    locationName?: string;
}

export class OriginResolverService {
    static async resolve(origin: OriginInput): Promise<ResolvedOrigin> {
        if (origin.type === 'current_location' || origin.type === 'map_point') {
            return {
                type: origin.type,
                coordinates: origin.coordinates,
            };
        }

        if (origin.type === 'location_reference') {
            const loc = await Location.findOne({ _id: origin.locationId, status: 'approved' });
            if (loc && loc.geo && Array.isArray(loc.geo.coordinates) && loc.geo.coordinates.length === 2) {
                return {
                    type: 'location_reference',
                    coordinates: loc.geo.coordinates as [number, number],
                    locationId: loc._id.toString(),
                    locationName: loc.name,
                };
            }
        }

        return {
            type: 'current_location',
            coordinates: HUE_CITY_CENTER_COORDINATES,
        };
    }
}
