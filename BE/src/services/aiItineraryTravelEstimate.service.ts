import {
    AI_ITINERARY_TRANSPORT_SPEED_KMH,
    GLOBAL_FALLBACK_TRAVEL_SPEED_KMH,
} from '../config/aiItinerary.config.ts';

export class TravelEstimateService {
    static calculateHaversineDistanceKm(
        coord1: [number, number],
        coord2: [number, number],
    ): number {
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const R = 6371; // Earth radius in KM
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        return Math.round(distanceKm * 100) / 100;
    }

    static estimateTravelMinutes(
        coord1: [number, number],
        coord2: [number, number],
        transportMode: string = 'motorcycle',
    ): number {
        const distanceKm = this.calculateHaversineDistanceKm(coord1, coord2);
        const speedKmh =
            AI_ITINERARY_TRANSPORT_SPEED_KMH[transportMode] || GLOBAL_FALLBACK_TRAVEL_SPEED_KMH;

        if (distanceKm === 0) return 0;

        const travelMinutes = Math.ceil((distanceKm / speedKmh) * 60);
        return Math.max(5, travelMinutes); // Minimum 5 minutes buffer
    }
}
