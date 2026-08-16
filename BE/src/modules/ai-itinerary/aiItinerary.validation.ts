import { categoryTagWhitelist } from '../../config/category-tag-whitelist.ts';
import { createAIItineraryPlanRequestSchema, type PreferencesInput } from '../../schemas/aiItinerary.schema.ts';

export interface CategoryTagValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateCategoryAndTagRules = (preferences: PreferencesInput): CategoryTagValidationResult => {
    const errors: string[] = [];

    const validCategories = new Set(Object.keys(categoryTagWhitelist));
    for (const categoryCode of preferences.categoryCodes || []) {
        if (!validCategories.has(categoryCode)) {
            errors.push(`Category code "${categoryCode}" không hợp lệ.`);
        }
    }

    const allAllowedTags = new Set<string>();
    for (const rule of Object.values(categoryTagWhitelist)) {
        rule.allowedTagCodes.forEach((tag) => allAllowedTags.add(tag));
    }

    const checkTagList = (tags: string[] | undefined, label: string) => {
        for (const tagCode of tags || []) {
            if (!allAllowedTags.has(tagCode)) {
                errors.push(`Tag code "${tagCode}" trong ${label} không hợp lệ.`);
            }
        }
    };

    checkTagList(preferences.requiredTagCodes, 'requiredTagCodes');
    checkTagList(preferences.preferredTagCodes, 'preferredTagCodes');
    checkTagList(preferences.avoidTagCodes, 'avoidTagCodes');

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const parseAndValidateAIItineraryRequest = (input: unknown) => {
    const parsed = createAIItineraryPlanRequestSchema.parse(input);
    const categoryTagCheck = validateCategoryAndTagRules(parsed.preferences);

    if (!categoryTagCheck.isValid) {
        throw new Error(`VALIDATION_ERROR: ${categoryTagCheck.errors.join(' ')}`);
    }

    return parsed;
};
