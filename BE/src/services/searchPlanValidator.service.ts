import Category from '../models/category.model.ts';
import TagGroup from '../models/tagGroup.model.ts';
import { searchPlanSchema, type SearchInterpretation, type SearchPlan } from '../schemas/locationSearch.schema.ts';
import { ApiError } from '../utils/apiError.ts';
import { getWardByCode } from './reference.service.ts';

const DAY_NAMES = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];

export const validateSearchPlan = async (rawPlan: unknown): Promise<{
    criteria: SearchPlan;
    interpretation: SearchInterpretation;
}> => {
    const criteria = searchPlanSchema.parse(rawPlan);
    const allTagCodes = [...criteria.requiredTagCodes, ...criteria.preferredTagCodes];
    const [category, groups] = await Promise.all([
        criteria.categoryCode
            ? Category.findOne({ code: criteria.categoryCode, isActive: true })
                .select({ _id: 0, code: 1, name: 1, allowedTagCodes: 1 }).lean()
            : Promise.resolve(null),
        TagGroup.find({ isActive: true, 'tags.code': { $in: allTagCodes } })
            .select({ _id: 0, code: 1, selectionMode: 1, tags: 1 }).lean(),
    ]);

    if (criteria.categoryCode && !category) {
        throw new ApiError(422, 'INVALID_SEARCH_PLAN', 'Danh mục trong kết quả AI không hợp lệ.');
    }

    const activeTagNames = new Map(groups.flatMap((group) => group.tags)
        .filter(({ isActive }) => isActive)
        .map(({ code, name }) => [code, name]));
    const allowedCodes = new Set(criteria.categoryCode
        ? category?.allowedTagCodes ?? []
        : activeTagNames.keys());
    const invalidTagCodes = allTagCodes.filter((code) => !activeTagNames.has(code) || !allowedCodes.has(code));
    if (invalidTagCodes.length) {
        throw new ApiError(422, 'INVALID_SEARCH_PLAN', 'Đặc điểm không phù hợp với danh mục.', { invalidTagCodes });
    }

    for (const group of groups.filter(({ selectionMode }) => selectionMode === 'single')) {
        const selected = group.tags.filter(({ code }) => allTagCodes.includes(code));
        if (selected.length > 1) {
            throw new ApiError(422, 'INVALID_SEARCH_PLAN', 'Một nhóm đặc điểm chỉ được chọn một giá trị.', {
                groupCode: group.code,
                selectedTagCodes: selected.map(({ code }) => code),
            });
        }
    }

    const ward = criteria.wardCode ? getWardByCode(criteria.wardCode) : undefined;
    if (criteria.wardCode && !ward) {
        throw new ApiError(422, 'INVALID_SEARCH_PLAN', 'Phường/xã trong kết quả AI không hợp lệ.');
    }

    return {
        criteria,
        interpretation: {
            category: category ? { code: category.code, name: category.name } : null,
            requiredTags: criteria.requiredTagCodes.map((code) => ({ code, name: activeTagNames.get(code) ?? code })),
            preferredTags: criteria.preferredTagCodes.map((code) => ({ code, name: activeTagNames.get(code) ?? code })),
            ward: ward ? { code: ward.code, name: ward.name } : null,
            openCondition: criteria.openCondition
                ? {
                    label: criteria.openCondition.mode === 'now'
                        ? 'Đang mở cửa'
                        : `Mở ${DAY_NAMES[criteria.openCondition.dayOfWeek - 1]} lúc ${criteria.openCondition.time}`,
                }
                : null,
        },
    };
};
