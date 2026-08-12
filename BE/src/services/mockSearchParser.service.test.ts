import { describe, expect, it } from 'vitest';
import { MockSearchParser } from './mockSearchParser.service.ts';

const catalog = {
    categories: [{ code: 'cafe', name: 'Quán cà phê' }],
    tags: [
        { code: 'quiet', name: 'Yên tĩnh', categoryCodes: ['cafe'] },
        { code: 'wifi', name: 'Có Wi-Fi', categoryCodes: ['cafe'] },
    ],
    wards: [{ code: 'phu_hoi', name: 'Phường Phú Hội' }],
};

describe('MockSearchParser', () => {
    it('maps category, soft preferences and ward to catalog codes', async () => {
        const result = await new MockSearchParser().parse({
            query: 'Quán cà phê yên tĩnh có Wi-Fi ở phường Phú Hội',
            ...catalog,
        });
        expect(result).toMatchObject({
            categoryCode: 'cafe',
            requiredTagCodes: [],
            preferredTagCodes: ['quiet', 'wifi'],
            wardCode: 'phu_hoi',
        });
    });

    it('treats explicit mandatory language as hard constraints', async () => {
        const result = await new MockSearchParser().parse({
            query: 'Cafe bắt buộc có Wi-Fi',
            ...catalog,
        });
        expect(result.requiredTagCodes).toEqual(['wifi']);
        expect(result.preferredTagCodes).toEqual([]);
    });
});
