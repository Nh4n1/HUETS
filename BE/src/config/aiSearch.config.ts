export type AiProvider = 'mock' | 'gemini';

const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

export const aiSearchConfig = {
    provider: (provider === 'gemini' ? 'gemini' : 'mock') as AiProvider,
    fallbackToMock: process.env.AI_FALLBACK_TO_MOCK !== 'false',
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() ?? '',
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
    timeoutMs: Math.max(Number(process.env.AI_TIMEOUT_MS) || 10_000, 1_000),
};
