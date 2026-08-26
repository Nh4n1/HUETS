import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('geocoding service', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('validates the search query before calling the provider', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        const { searchPlaces } = await import('./geocoding.service.ts');

        await expect(searchPlaces(' ')).rejects.toMatchObject({
            statusCode: 400,
            code: 'VALIDATION_ERROR',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps provider results and caches repeated searches', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
            {
                place_id: 123,
                lat: '16.4637',
                lon: '107.5909',
                name: 'Đại Nội Huế',
                display_name: 'Đại Nội Huế, Phú Xuân, Thành phố Huế, Việt Nam',
                type: 'attraction',
                address: { road: 'Đường 23 Tháng 8' },
            },
        ]), { status: 200 }));
        const { searchPlaces } = await import('./geocoding.service.ts');

        const first = await searchPlaces('Đại Nội Huế');
        const second = await searchPlaces('  đại nội huế  ');

        expect(first).toEqual([{
            id: '123',
            name: 'Đại Nội Huế',
            displayName: 'Đại Nội Huế, Phú Xuân, Thành phố Huế, Việt Nam',
            addressLine: 'Đường 23 Tháng 8',
            latitude: 16.4637,
            longitude: 107.5909,
            type: 'attraction',
        }]);
        expect(second).toEqual(first);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
        expect(requestedUrl.searchParams.get('countrycodes')).toBe('vn');
        expect(requestedUrl.searchParams.get('addressdetails')).toBe('1');
    });

    it('returns a controlled error when the provider fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));
        const { searchPlaces } = await import('./geocoding.service.ts');

        await expect(searchPlaces('Chùa Thiên Mụ')).rejects.toMatchObject({
            statusCode: 502,
            code: 'GEOCODING_UNAVAILABLE',
        });
    });
});
