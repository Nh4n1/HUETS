import type { PreferencesInput } from '../schemas/aiItinerary.schema.ts';

export interface NormalizedPreferences {
    categoryCodes: string[];
    requiredTagCodes: string[];
    preferredTagCodes: string[];
    avoidTagCodes: string[];
    priceLevels: number[];
}

export class PreferenceParserService {
    static normalize(explicitPreferences: PreferencesInput): NormalizedPreferences {
        const categoryCodes = [...new Set(explicitPreferences.categoryCodes || [])];
        const requiredTagCodes = [...new Set(explicitPreferences.requiredTagCodes || [])];
        const avoidTagCodes = [...new Set(explicitPreferences.avoidTagCodes || [])];
        const preferredTagCodes = [...new Set(explicitPreferences.preferredTagCodes || [])].filter(
            (code) => !requiredTagCodes.includes(code) && !avoidTagCodes.includes(code),
        );
        const priceLevels = [...new Set(explicitPreferences.priceLevels || [])];

        return {
            categoryCodes,
            requiredTagCodes,
            preferredTagCodes,
            avoidTagCodes,
            priceLevels,
        };
    }
}
