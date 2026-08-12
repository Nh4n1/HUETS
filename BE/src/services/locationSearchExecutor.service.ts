import { normalizeSearchText } from '../helpers/text.helper.ts';
import Category from '../models/category.model.ts';
import Location from '../models/location.model.ts';
import type { SearchPlan } from '../schemas/locationSearch.schema.ts';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const executeSearchPlan = async (criteria: SearchPlan, page: number, pageSize: number) => {
    const filter: Record<string, unknown> = { status: 'approved' };
    if (criteria.categoryCode) filter.categoryCode = criteria.categoryCode;
    if (criteria.wardCode) filter['address.wardCode'] = criteria.wardCode;
    if (criteria.requiredTagCodes.length) filter.tagCodes = { $all: criteria.requiredTagCodes };
    if (criteria.keywords.length) {
        filter.searchText = {
            $regex: criteria.keywords.map((keyword) => escapeRegExp(normalizeSearchText(keyword))).join('|'),
            $options: 'i',
        };
    }

    const preferredCodes = criteria.preferredTagCodes;
    const [result] = await Location.aggregate<{
        data: Array<Record<string, any>>;
        total: Array<{ count: number }>;
    }>([
        { $match: filter },
        { $addFields: { preferredMatchCount: { $size: { $setIntersection: [{ $ifNull: ['$tagCodes', []] }, preferredCodes] } } } },
        { $sort: criteria.sortBy === 'rating_desc'
            ? { 'ratingSummary.average': -1, preferredMatchCount: -1, _id: 1 }
            : { preferredMatchCount: -1, 'ratingSummary.average': -1, _id: 1 } },
        { $facet: {
            data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
            total: [{ $count: 'count' }],
        } },
    ]);
    const documents = result?.data ?? [];
    const total = result?.total[0]?.count ?? 0;
    const categoryCodes = [...new Set(documents.map((document) => String(document.categoryCode)))];
    const categories = await Category.find({ code: { $in: categoryCodes } }).select({ _id: 0, code: 1, name: 1 }).lean();
    const categoryNames = new Map(categories.map(({ code, name }) => [code, name]));

    return {
        data: documents.map((location) => ({
            id: String(location._id),
            name: location.name,
            category: { code: location.categoryCode, name: categoryNames.get(location.categoryCode) ?? location.categoryCode },
            formattedAddress: [location.address?.addressLine, location.address?.wardNameSnapshot, 'Thành phố Huế'].filter(Boolean).join(', '),
            coverImageUrl: [...(location.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
            averageRating: location.ratingSummary?.average ?? 0,
            reviewCount: location.ratingSummary?.count ?? 0,
            tagCodes: location.tagCodes ?? [],
        })),
        meta: { page, pageSize, total, totalPages: total ? Math.ceil(total / pageSize) : 0 },
    };
};
