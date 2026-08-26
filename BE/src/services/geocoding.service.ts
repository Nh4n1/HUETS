import { geocodingConfig } from '../config/geocoding.config.ts';
import { ApiError } from '../utils/apiError.ts';

interface NominatimAddress {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
}

interface NominatimResult {
    place_id?: number;
    lat: string;
    lon: string;
    name?: string;
    display_name?: string;
    type?: string;
    address?: NominatimAddress;
}

export interface GeocodingResult {
    id: string;
    name: string;
    displayName: string;
    addressLine: string;
    latitude: number;
    longitude: number;
    type: string | null;
}

interface CacheEntry {
    expiresAt: number;
    value: GeocodingResult[];
}

const cache = new Map<string, CacheEntry>();
let requestQueue: Promise<void> = Promise.resolve();
let lastUpstreamRequestAt = 0;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const normalizedQuery = (value: unknown) => {
    if (typeof value !== 'string') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm không hợp lệ.');
    }
    const query = value.trim().replace(/\s+/g, ' ');
    if (query.length < 2 || query.length > 200) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm phải có từ 2 đến 200 ký tự.');
    }
    return query;
};

const addressLineFrom = (result: NominatimResult) => {
    const address = result.address ?? {};
    const street = address.road ?? address.pedestrian;
    const detailed = [address.house_number, street].filter(Boolean).join(' ');
    return detailed || street || address.neighbourhood || address.quarter || address.suburb || result.name || '';
};

const mapResult = (result: NominatimResult): GeocodingResult | null => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const displayName = typeof result.display_name === 'string' ? result.display_name.trim() : '';
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !displayName) return null;
    return {
        id: result.place_id === undefined ? `${latitude}:${longitude}` : String(result.place_id),
        name: result.name?.trim() || displayName.split(',')[0]?.trim() || 'Địa điểm',
        displayName,
        addressLine: addressLineFrom(result),
        latitude,
        longitude,
        type: result.type ?? null,
    };
};

const requestUpstream = async (query: string) => {
    const earliestRequestAt = lastUpstreamRequestAt + 1_000;
    const waitMs = earliestRequestAt - Date.now();
    if (waitMs > 0) await delay(waitMs);
    lastUpstreamRequestAt = Date.now();

    const url = new URL('/search', geocodingConfig.baseUrl);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(geocodingConfig.resultLimit));
    url.searchParams.set('countrycodes', 'vn');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'vi');
    // Bias results toward Huế while still allowing a matching result nearby.
    url.searchParams.set('viewbox', '107.0,16.8,108.3,15.8');

    let response: Response;
    try {
        response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': geocodingConfig.userAgent,
            },
            signal: AbortSignal.timeout(geocodingConfig.timeoutMs),
        });
    } catch {
        throw new ApiError(502, 'GEOCODING_UNAVAILABLE', 'Dịch vụ tìm kiếm địa điểm tạm thời không khả dụng.');
    }

    if (!response.ok) {
        throw new ApiError(502, 'GEOCODING_UNAVAILABLE', 'Dịch vụ tìm kiếm địa điểm tạm thời không khả dụng.');
    }
    let payload: NominatimResult[];
    try {
        payload = await response.json() as NominatimResult[];
    } catch {
        throw new ApiError(502, 'GEOCODING_UNAVAILABLE', 'Dịch vụ tìm kiếm địa điểm trả về dữ liệu không hợp lệ.');
    }
    if (!Array.isArray(payload)) {
        throw new ApiError(502, 'GEOCODING_UNAVAILABLE', 'Dịch vụ tìm kiếm địa điểm trả về dữ liệu không hợp lệ.');
    }
    return payload.map(mapResult).filter((result): result is GeocodingResult => result !== null);
};

const enqueueUpstreamRequest = <T>(task: () => Promise<T>) => {
    const result = requestQueue.then(task, task);
    requestQueue = result.then(() => undefined, () => undefined);
    return result;
};

export const searchPlaces = async (rawQuery: unknown) => {
    const query = normalizedQuery(rawQuery);
    const cacheKey = query.toLocaleLowerCase('vi-VN');
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) cache.delete(cacheKey);

    const results = await enqueueUpstreamRequest(() => requestUpstream(query));
    cache.set(cacheKey, { value: results, expiresAt: Date.now() + geocodingConfig.cacheTtlMs });

    if (cache.size > 500) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
    }
    return results;
};
