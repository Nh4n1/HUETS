import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryTagWhitelist } from '../config/category-tag-whitelist.ts';
import Category from '../models/category.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import { tagGroups as referenceTagGroups } from '../reference/reference.data.ts';
import { validateReferenceCatalog } from '../reference/reference.validator.ts';
import { ApiError } from '../utils/apiError.ts';

interface WardReference {
    code: string;
    name: string;
    normalizedName: string;
    isActive: boolean;
}

validateReferenceCatalog();

let wardCache: WardReference[] | undefined;

const resolveWardFilePath = () => {
    const candidates = [
        resolve(process.cwd(), 'resources', 'hue_wards.json'),
        resolve(process.cwd(), 'BE', 'resources', 'hue_wards.json'),
        fileURLToPath(new URL('../../resources/hue_wards.json', import.meta.url)),
    ];
    const wardFilePath = candidates.find(existsSync);

    if (!wardFilePath) {
        throw new Error('Cannot find resources/hue_wards.json.');
    }
    return wardFilePath;
};

const loadWards = () => {
    if (wardCache) return wardCache;

    const parsed: unknown = JSON.parse(readFileSync(resolveWardFilePath(), 'utf8'));
    if (!Array.isArray(parsed)) {
        throw new Error('hue_wards.json must contain an array.');
    }

    const wards = parsed as WardReference[];
    const codes = new Set<string>();

    for (const ward of wards) {
        if (
            typeof ward.code !== 'string'
            || typeof ward.name !== 'string'
            || typeof ward.normalizedName !== 'string'
            || typeof ward.isActive !== 'boolean'
        ) {
            throw new Error('hue_wards.json contains an invalid ward record.');
        }
        if (codes.has(ward.code)) {
            throw new Error(`hue_wards.json contains duplicate ward code: ${ward.code}.`);
        }
        codes.add(ward.code);
    }

    if (wards.length !== 40) {
        throw new Error(`Expected 40 Hue wards/communes, received ${wards.length}.`);
    }

    wardCache = wards;
    return wardCache;
};

export const getCategories = async () => Category.find({ isActive: true })
    .sort({ sortOrder: 1, code: 1 })
    .select({ _id: 0, code: 1, name: 1, description: 1, sortOrder: 1 })
    .lean();

export const getTagsByCategory = async (rawCategoryCode: string) => {
    const categoryCode = rawCategoryCode.trim().toLowerCase();
    const rule = categoryTagWhitelist[categoryCode];
    const category = await Category.findOne({ code: categoryCode, isActive: true })
        .select({ _id: 0, code: 1, name: 1 })
        .lean();

    if (!category || !rule) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy danh mục địa điểm.');
    }

    const storedGroups = await TagGroup.find({ isActive: true, 'tags.code': { $in: rule.allowedTagCodes } })
        .select({ _id: 0, code: 1, name: 1, selectionMode: 1, tags: 1 })
        .lean();
    const storedGroupByCode = new Map(storedGroups.map((group) => [group.code, group]));
    const allowedCodes = new Set(rule.allowedTagCodes);
    const recommendedCodes = new Set(rule.recommendedTagCodes);
    const tagLookup = new Map<string, { code: string; name: string }>();

    const groups = referenceTagGroups.flatMap(({ code }) => {
        const group = storedGroupByCode.get(code);
        if (!group) return [];

        const tags = group.tags
            .filter((tag) => tag.isActive && allowedCodes.has(tag.code))
            .map((tag) => {
                const value = {
                    code: tag.code,
                    name: tag.name,
                    isRecommended: recommendedCodes.has(tag.code),
                };
                tagLookup.set(tag.code, { code: tag.code, name: tag.name });
                return value;
            });

        if (tags.length === 0) return [];
        return [{ code: group.code, name: group.name, selectionMode: group.selectionMode, tags }];
    });

    const recommendedTags = rule.recommendedTagCodes
        .map((code) => tagLookup.get(code))
        .filter((tag): tag is { code: string; name: string } => tag !== undefined);

    return {
        category,
        maxSelections: 10,
        recommendedTags,
        groups,
    };
};

export const getWards = () => loadWards()
    .filter(({ isActive }) => isActive)
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'));

export const getWardByCode = (wardCode: string) => loadWards()
    .find((ward) => ward.code === wardCode && ward.isActive);
