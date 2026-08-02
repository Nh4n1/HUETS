import { categoryTagWhitelist } from '../config/category-tag-whitelist.ts';
import { categories, tagGroups } from './reference.data.ts';

const assertUnique = (values: string[], label: string) => {
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== values.length) {
        throw new Error(`${label} contains duplicate codes.`);
    }
};

export const validateReferenceCatalog = () => {
    if (categories.length !== 12) {
        throw new Error(`Expected 12 categories, received ${categories.length}.`);
    }
    if (tagGroups.length !== 8) {
        throw new Error(`Expected 8 tag groups, received ${tagGroups.length}.`);
    }

    const categoryCodes = categories.map(({ code }) => code);
    const tagCodes = tagGroups.flatMap(({ tags }) => tags.map(({ code }) => code));

    if (tagCodes.length !== 38) {
        throw new Error(`Expected 38 tags, received ${tagCodes.length}.`);
    }

    assertUnique(categoryCodes, 'Category catalog');
    assertUnique(tagGroups.map(({ code }) => code), 'Tag group catalog');
    assertUnique(tagCodes, 'Tag catalog');

    const knownTags = new Set(tagCodes);
    const whitelistCategories = Object.keys(categoryTagWhitelist);
    assertUnique(whitelistCategories, 'Category–Tag whitelist');

    if (whitelistCategories.length !== categoryCodes.length || categoryCodes.some((code) => !categoryTagWhitelist[code])) {
        throw new Error('Category–Tag whitelist must define every category exactly once.');
    }

    for (const [categoryCode, rule] of Object.entries(categoryTagWhitelist)) {
        assertUnique(rule.allowedTagCodes, `${categoryCode}.allowedTagCodes`);
        assertUnique(rule.recommendedTagCodes, `${categoryCode}.recommendedTagCodes`);

        for (const code of rule.allowedTagCodes) {
            if (!knownTags.has(code)) {
                throw new Error(`${categoryCode} allows unknown tag: ${code}.`);
            }
        }
        for (const code of rule.recommendedTagCodes) {
            if (!rule.allowedTagCodes.includes(code)) {
                throw new Error(`${categoryCode} recommends a tag that is not allowed: ${code}.`);
            }
        }
    }
};
