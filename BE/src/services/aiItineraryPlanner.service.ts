import { aiSearchConfig } from '../config/aiSearch.config.ts';
import type { AIPlannerClient, AIPlannerCreatePlanInput, AIPlannerRepairPlanInput, AIPlannerOutput } from '../integrations/ai/aiClient.interface.ts';
import { GeminiPlannerClient, MockPlannerClient } from '../integrations/ai/providerClient.ts';

export class AIItineraryPlannerService {
    private getClient(): AIPlannerClient {
        if (aiSearchConfig.provider === 'gemini' && aiSearchConfig.geminiApiKey) {
            return new GeminiPlannerClient();
        }
        return new MockPlannerClient();
    }

    async createPlan(input: AIPlannerCreatePlanInput): Promise<AIPlannerOutput> {
        const client = this.getClient();
        try {
            return await client.createPlan(input);
        } catch (error) {
            if (aiSearchConfig.fallbackToMock && client instanceof GeminiPlannerClient) {
                const mockClient = new MockPlannerClient();
                return await mockClient.createPlan(input);
            }
            throw error;
        }
    }

    async repairPlan(input: AIPlannerRepairPlanInput): Promise<AIPlannerOutput> {
        const client = this.getClient();
        try {
            return await client.repairPlan(input);
        } catch (error) {
            if (aiSearchConfig.fallbackToMock && client instanceof GeminiPlannerClient) {
                const mockClient = new MockPlannerClient();
                return await mockClient.repairPlan(input);
            }
            throw error;
        }
    }
}
