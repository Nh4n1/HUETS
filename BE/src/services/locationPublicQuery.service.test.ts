import { describe, expect, it } from 'vitest';
import { buildPublicLocationFilter, getPublicLocationSort } from './location.service.ts';

describe('public location filters', () => {
    it('always limits results to approved locations', () => {
        expect(buildPublicLocationFilter({})).toEqual({ status: 'approved', isDeleted: { $ne: true } });
    });

    it('normalizes search, category, ward and unique tag filters', () => {
        expect(buildPublicLocationFilter({
            q: '  Cà phê yên tĩnh  ',
            categoryCode: ' CAFE ',
            wardCode: ' 001 ',
            tagCodes: 'WiFi, quiet, wifi',
        })).toEqual({
            status: 'approved',
            isDeleted: { $ne: true },
            searchText: { $regex: 'ca phe yen tinh', $options: 'i' },
            categoryCode: 'cafe',
            'address.wardCode': '001',
            tagCodes: { $all: ['wifi', 'quiet'] },
        });
    });

    it('removes regular expression characters from the normalized search query', () => {
        expect(buildPublicLocationFilter({ q: 'cafe (view)' })).toMatchObject({
            searchText: { $regex: 'cafe view', $options: 'i' },
        });
    });

    it('rejects a non-empty search query that has no letters or numbers', () => {
        expect(() => buildPublicLocationFilter({ q: '!!!' })).toThrow(
            'Nội dung tìm kiếm phải chứa chữ hoặc số.',
        );
    });

    it('rejects invalid tag filters and accepts more than ten tags', () => {
        expect(() => buildPublicLocationFilter({ tagCodes: 'wifi,not valid' })).toThrow(
            'Danh sách đặc điểm lọc không hợp lệ.',
        );
        expect(buildPublicLocationFilter({
            tagCodes: Array.from({ length: 11 }, (_, index) => `tag_${index}`).join(','),
        }).tagCodes).toEqual({ $all: Array.from({ length: 11 }, (_, index) => `tag_${index}`) });
    });
});

describe('public location sorting', () => {
    it('uses deterministic recommended, rating and newest orders', () => {
        expect(getPublicLocationSort('recommended')).toEqual({
            'ratingSummary.average': -1,
            'ratingSummary.count': -1,
            createdAt: -1,
            _id: -1,
        });
        expect(getPublicLocationSort('rating_desc')).toEqual({
            'ratingSummary.average': -1,
            'ratingSummary.count': -1,
            _id: -1,
        });
        expect(getPublicLocationSort('newest')).toEqual({ createdAt: -1, _id: -1 });
    });
});
