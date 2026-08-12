import type { SearchPlan } from '../schemas/locationSearch.schema.ts';

export interface AiSearchInput {
    query: string;

    categories: Array<{
        code: string;
        name: string;
    }>;

    tags: Array<{
        code: string;
        name: string;
        categoryCodes: string[];
    }>;

    wards: Array<{
        code: string;
        name: string;
    }>;
}

export interface AiSearchParser {
    parse(input: AiSearchInput): Promise<SearchPlan>;
}
