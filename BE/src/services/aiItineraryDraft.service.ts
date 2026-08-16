import AIItineraryDraft from '../models/aiItineraryDraft.model.ts';
import type { IAIItineraryDraft } from '../models/aiItineraryDraft.model.ts';
import { AI_ITINERARY_CONSTANTS } from '../config/aiItinerary.config.ts';
import type { Types } from 'mongoose';

export class AIItineraryDraftService {
    static async createDraft(data: Partial<IAIItineraryDraft>): Promise<IAIItineraryDraft> {
        const expiresAt = new Date(Date.now() + AI_ITINERARY_CONSTANTS.DRAFT_TTL_SECONDS * 1000);
        const draft = new AIItineraryDraft({
            ...data,
            expiresAt,
        });
        return await draft.save();
    }

    static async getOwnedActiveDraft(
        draftId: string,
        ownerId: string | Types.ObjectId,
    ): Promise<IAIItineraryDraft | null> {
        return await AIItineraryDraft.findOne({
            _id: draftId,
            ownerId,
            expiresAt: { $gt: new Date() },
        });
    }

    static async updateOwnedDraft(
        draftId: string,
        ownerId: string | Types.ObjectId,
        updateData: Partial<IAIItineraryDraft>,
    ): Promise<IAIItineraryDraft | null> {
        const expiresAt = new Date(Date.now() + AI_ITINERARY_CONSTANTS.DRAFT_TTL_SECONDS * 1000);
        return await AIItineraryDraft.findOneAndUpdate(
            { _id: draftId, ownerId, expiresAt: { $gt: new Date() } },
            { $set: { ...updateData, expiresAt } },
            { new: true },
        );
    }

    static async deleteOwnedDraft(
        draftId: string,
        ownerId: string | Types.ObjectId,
    ): Promise<boolean> {
        const result = await AIItineraryDraft.deleteOne({ _id: draftId, ownerId });
        return result.deletedCount > 0;
    }
}
