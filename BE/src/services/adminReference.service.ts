import { ZodError, type ZodType } from 'zod';
import Category from '../models/category.model.ts';
import Location from '../models/location.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import {
    createCategorySchema,
    createTagGroupSchema,
    createTagSchema,
    taxonomyCodeSchema,
    updateCategorySchema,
    updateCategoryTagRulesSchema,
    updateTagGroupSchema,
    updateTagSchema,
} from '../schemas/adminReference.schema.ts';
import { ApiError } from '../utils/apiError.ts';

const parse = <T>(schema: ZodType<T>, input: unknown): T => {
    try {
        return schema.parse(input);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu taxonomy không hợp lệ.', {
                issues: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
            });
        }
        throw error;
    }
};

const parseCode = (value: string, label: string) => {
    const result = taxonomyCodeSchema.safeParse(value);
    if (!result.success) throw new ApiError(404, 'NOT_FOUND', `Không tìm thấy ${label}.`);
    return result.data;
};

const assertHasChanges = (value: object) => {
    if (Object.keys(value).length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Cần cung cấp ít nhất một thay đổi.');
    }
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertActiveTagCodes = async (codes: string[]) => {
    if (codes.length === 0) return;
    const groups = await TagGroup.find({ isActive: true, 'tags.code': { $in: codes } })
        .select({ _id: 0, tags: 1 })
        .lean();
    const activeCodes = new Set(groups.flatMap(({ tags }) => tags
        .filter(({ isActive }) => isActive)
        .map(({ code }) => code)));
    const invalidTagCodes = codes.filter((code) => !activeCodes.has(code));
    if (invalidTagCodes.length > 0) {
        throw new ApiError(422, 'INVALID_CATEGORY_TAG_COMBINATION', 'Tag không tồn tại hoặc đã ngừng hoạt động.', {
            invalidTagCodes,
        });
    }
};

const assertRecommendedSubset = (allowedTagCodes: string[], recommendedTagCodes: string[]) => {
    const allowed = new Set(allowedTagCodes);
    const invalidTagCodes = recommendedTagCodes.filter((code) => !allowed.has(code));
    if (invalidTagCodes.length > 0) {
        throw new ApiError(422, 'RECOMMENDED_TAG_NOT_ALLOWED', 'Tag được đề xuất phải nằm trong danh sách Tag được phép.', {
            invalidTagCodes,
        });
    }
};

const categoryView = (category: {
    code: string;
    name: string;
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
    allowedTagCodes: string[];
    recommendedTagCodes: string[];
    createdAt?: Date;
    updatedAt?: Date;
}, locationUsageCount?: number) => ({
    code: category.code,
    name: category.name,
    description: category.description ?? '',
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    allowedTagCodes: category.allowedTagCodes,
    recommendedTagCodes: category.recommendedTagCodes,
    allowedTagCount: category.allowedTagCodes.length,
    recommendedTagCount: category.recommendedTagCodes.length,
    ...(locationUsageCount === undefined ? {} : { locationUsageCount }),
    ...(category.createdAt ? { createdAt: category.createdAt } : {}),
    ...(category.updatedAt ? { updatedAt: category.updatedAt } : {}),
});

export interface AdminCategoryQuery {
    q?: string;
    status?: string;
}

export const getCategories = async (query: AdminCategoryQuery) => {
    const filter: Record<string, unknown> = {};
    if (query.status && !['active', 'inactive', 'all'].includes(query.status)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Trạng thái lọc không hợp lệ.');
    }
    if (query.status === 'active') filter.isActive = true;
    if (query.status === 'inactive') filter.isActive = false;
    const keyword = query.q?.trim();
    if (keyword) {
        const pattern = new RegExp(escapeRegex(keyword), 'i');
        filter.$or = [{ code: pattern }, { name: pattern }];
    }

    const categories = await Category.find(filter).sort({ sortOrder: 1, code: 1 }).lean();
    const usageRows = await Location.aggregate<{ _id: string; count: number }>([
        { $match: { isDeleted: { $ne: true }, categoryCode: { $in: categories.map(({ code }) => code) } } },
        { $group: { _id: '$categoryCode', count: { $sum: 1 } } },
    ]);
    const usage = new Map(usageRows.map(({ _id, count }) => [_id, count]));
    return categories.map((category) => categoryView(category, usage.get(category.code) ?? 0));
};

export const getCategory = async (rawCode: string) => {
    const code = parseCode(rawCode, 'danh mục');
    const category = await Category.findOne({ code }).lean();
    if (!category) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy danh mục.');
    const locationUsageCount = await Location.countDocuments({ categoryCode: code, isDeleted: { $ne: true } });
    return categoryView(category, locationUsageCount);
};

export const createCategory = async (input: unknown) => {
    const data = parse(createCategorySchema, input);
    assertRecommendedSubset(data.allowedTagCodes, data.recommendedTagCodes);
    await assertActiveTagCodes(data.allowedTagCodes);
    if (await Category.exists({ code: data.code })) {
        throw new ApiError(409, 'CATEGORY_CODE_ALREADY_EXISTS', 'Code danh mục đã tồn tại.');
    }
    const category = await Category.create({
        code: data.code,
        name: data.name,
        sortOrder: data.sortOrder,
        allowedTagCodes: data.allowedTagCodes,
        recommendedTagCodes: data.recommendedTagCodes,
        ...(data.description === undefined ? {} : { description: data.description }),
    });
    return categoryView(category);
};

export const updateCategory = async (rawCode: string, input: unknown) => {
    const code = parseCode(rawCode, 'danh mục');
    const data = parse(updateCategorySchema, input);
    assertHasChanges(data);
    const category = await Category.findOne({ code });
    if (!category) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy danh mục.');
    if (category.isActive && data.isActive === false) {
        const usageCount = await Location.countDocuments({ categoryCode: code, isDeleted: { $ne: true } });
        if (usageCount > 0) {
            throw new ApiError(409, 'CATEGORY_IN_USE', 'Không thể ngừng danh mục đang được địa điểm sử dụng.', { usageCount });
        }
    }
    category.set(data);
    await category.save();
    return categoryView(category);
};

export const updateCategoryTagRules = async (rawCode: string, input: unknown) => {
    const code = parseCode(rawCode, 'danh mục');
    const data = parse(updateCategoryTagRulesSchema, input);
    assertRecommendedSubset(data.allowedTagCodes, data.recommendedTagCodes);
    await assertActiveTagCodes(data.allowedTagCodes);
    const category = await Category.findOne({ code });
    if (!category) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy danh mục.');

    const nextAllowed = new Set(data.allowedTagCodes);
    const removedTagCodes = category.allowedTagCodes.filter((tagCode) => !nextAllowed.has(tagCode));
    if (removedTagCodes.length > 0) {
        const location = await Location.findOne({
            categoryCode: code,
            tagCodes: { $in: removedTagCodes },
            isDeleted: { $ne: true },
        }).select({ _id: 1, tagCodes: 1 }).lean();
        if (location) {
            throw new ApiError(409, 'CATEGORY_TAG_MAPPING_IN_USE', 'Không thể bỏ Tag đang được địa điểm trong danh mục sử dụng.', {
                tagCodes: removedTagCodes.filter((tagCode) => location.tagCodes.includes(tagCode)),
            });
        }
    }

    category.allowedTagCodes = data.allowedTagCodes;
    category.recommendedTagCodes = data.recommendedTagCodes;
    await category.save();
    return categoryView(category);
};

export const getTagGroups = async () => TagGroup.find({})
    .sort({ sortOrder: 1, code: 1 })
    .select({ _id: 0, code: 1, name: 1, selectionMode: 1, sortOrder: 1, isActive: 1, tags: 1, createdAt: 1, updatedAt: 1 })
    .lean();

export const createTagGroup = async (input: unknown) => {
    const data = parse(createTagGroupSchema, input);
    if (await TagGroup.exists({ code: data.code })) {
        throw new ApiError(409, 'TAG_GROUP_CODE_ALREADY_EXISTS', 'Code nhóm Tag đã tồn tại.');
    }
    return TagGroup.create({ ...data, tags: [], isActive: true });
};

export const updateTagGroup = async (rawCode: string, input: unknown) => {
    const code = parseCode(rawCode, 'nhóm Tag');
    const data = parse(updateTagGroupSchema, input);
    assertHasChanges(data);
    const group = await TagGroup.findOne({ code });
    if (!group) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy nhóm Tag.');
    if (group.isActive && data.isActive === false) {
        const tagCodes = group.tags.map(({ code: tagCode }) => tagCode);
        const usageCount = tagCodes.length === 0 ? 0 : await Location.countDocuments({
            tagCodes: { $in: tagCodes },
            isDeleted: { $ne: true },
        });
        if (usageCount > 0) {
            throw new ApiError(409, 'TAG_GROUP_IN_USE', 'Không thể ngừng nhóm Tag đang được địa điểm sử dụng.', { usageCount });
        }
    }
    group.set(data);
    await group.save();
    return group;
};

export const createTag = async (rawGroupCode: string, input: unknown) => {
    const groupCode = parseCode(rawGroupCode, 'nhóm Tag');
    const data = parse(createTagSchema, input);
    const group = await TagGroup.findOne({ code: groupCode });
    if (!group) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy nhóm Tag.');
    if (await TagGroup.exists({ 'tags.code': data.code })) {
        throw new ApiError(409, 'TAG_CODE_ALREADY_EXISTS', 'Code Tag đã tồn tại trong catalog.');
    }
    group.tags.push({ ...data, isActive: true });
    await group.save();
    return group.tags.find(({ code }) => code === data.code);
};

export const updateTag = async (rawGroupCode: string, rawTagCode: string, input: unknown) => {
    const groupCode = parseCode(rawGroupCode, 'nhóm Tag');
    const tagCode = parseCode(rawTagCode, 'Tag');
    const data = parse(updateTagSchema, input);
    assertHasChanges(data);
    const group = await TagGroup.findOne({ code: groupCode });
    const tag = group?.tags.find(({ code }) => code === tagCode);
    if (!group || !tag) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy Tag.');
    if (tag.isActive && data.isActive === false) {
        const usageCount = await Location.countDocuments({ tagCodes: tagCode, isDeleted: { $ne: true } });
        if (usageCount > 0) {
            throw new ApiError(409, 'TAG_IN_USE', 'Không thể ngừng Tag đang được địa điểm sử dụng.', { usageCount });
        }
    }
    if (data.name !== undefined) tag.name = data.name;
    if (data.isActive !== undefined) tag.isActive = data.isActive;
    await group.save();
    return tag;
};
