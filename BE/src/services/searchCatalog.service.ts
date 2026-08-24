import Category from '../models/category.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import type { AiSearchInput } from './aiSearchParser.service.ts';
import { getWards } from './reference.service.ts';

export type SearchCatalog = Omit<AiSearchInput, 'query'>;

export const getSearchCatalog = async (): Promise<SearchCatalog> => {
    const [categories, groups] = await Promise.all([
        Category.find({ isActive: true }).select({ _id: 0, code: 1, name: 1, allowedTagCodes: 1 }).lean(),
        TagGroup.find({ isActive: true }).select({ _id: 0, tags: 1 }).lean(),
    ]);

    const tags = groups.flatMap((group) => group.tags)
        .filter((tag) => tag.isActive)
        .map((tag) => ({
            code: tag.code,
            name: tag.name,
            categoryCodes: categories
                .filter(({ allowedTagCodes }) => allowedTagCodes.includes(tag.code))
                .map(({ code }) => code),
        }));

    return {
        categories: categories.map(({ code, name }) => ({ code, name })),
        tags,
        wards: getWards().map(({ code, name }) => ({ code, name })),
    };
};
