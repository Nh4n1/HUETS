import type { AIPlannerOutput } from '../integrations/ai/aiClient.interface.ts';
import type { ILocation } from '../models/location.model.ts';
import { AIItineraryPlannerService } from './aiItineraryPlanner.service.ts';

export interface PlanValidationResult {
    isValid: boolean;
    errors: string[];
}

export class AIItineraryPlanValidatorService {
    static validatePlan(
        plan: AIPlannerOutput,
        expectedDurationDays: number,
        candidates: ILocation[],
        mustVisitLocationIds: string[] = [],
    ): PlanValidationResult {
        const errors: string[] = [];

        if (!plan || typeof plan !== 'object') {
            return { isValid: false, errors: ['Kết quả trả về từ AI không phải là object hợp lệ.'] };
        }

        if (!plan.title || typeof plan.title !== 'string') {
            errors.push('Kế hoạch thiếu tiêu đề (title).');
        }

        if (!Array.isArray(plan.days) || plan.days.length !== expectedDurationDays) {
            errors.push(`Số ngày trong kế hoạch (${plan.days?.length || 0}) không đúng với yêu cầu (${expectedDurationDays} ngày).`);
        }

        const candidateIdSet = new Set(candidates.map((c) => c._id.toString()));
        const mustVisitSet = new Set(mustVisitLocationIds);
        const usedLocationIds = new Set<string>();

        for (const day of plan.days || []) {
            if (!Array.isArray(day.items)) continue;

            for (const item of day.items) {
                if (!item.locationId || typeof item.locationId !== 'string') {
                    errors.push(`Ngày ${day.dayNumber}: Địa điểm thiếu locationId.`);
                    continue;
                }

                if (!candidateIdSet.has(item.locationId)) {
                    errors.push(`Ngày ${day.dayNumber}: locationId "${item.locationId}" không nằm trong danh sách ứng viên hợp lệ.`);
                }

                if (usedLocationIds.has(item.locationId)) {
                    errors.push(`Địa điểm "${item.locationId}" bị lặp lại trong lịch trình.`);
                }

                usedLocationIds.add(item.locationId);

                if (!item.suggestedStartTime || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.suggestedStartTime)) {
                    errors.push(`Ngày ${day.dayNumber}: Định dạng giờ "${item.suggestedStartTime}" không hợp lệ.`);
                }

                if (!item.durationMinutes || item.durationMinutes < 1) {
                    errors.push(`Ngày ${day.dayNumber}: Thời lượng tham quan không hợp lệ.`);
                }
            }
        }

        for (const mustVisitId of mustVisitSet) {
            if (!usedLocationIds.has(mustVisitId)) {
                errors.push(`Địa điểm bắt buộc (ID: ${mustVisitId}) chưa được xếp vào lịch trình.`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    static async validateAndRepairPlan(
        initialPlan: AIPlannerOutput,
        expectedDurationDays: number,
        candidates: ILocation[],
        mustVisitLocationIds: string[] = [],
    ): Promise<AIPlannerOutput> {
        const validation = this.validatePlan(initialPlan, expectedDurationDays, candidates, mustVisitLocationIds);

        if (validation.isValid) {
            return initialPlan;
        }

        // Attempt 1-shot repair via AI
        const plannerService = new AIItineraryPlannerService();
        const candidateSummaries = candidates.map((c) => ({ id: c._id.toString(), name: c.name }));

        const repairedPlan = await plannerService.repairPlan({
            originalPlan: initialPlan,
            validationErrors: validation.errors,
            candidates: candidateSummaries,
        });

        const reValidation = this.validatePlan(repairedPlan, expectedDurationDays, candidates, mustVisitLocationIds);

        if (!reValidation.isValid) {
            throw new Error(`INVALID_PLAN: AI không thể tạo kế hoạch hợp lệ sau 1 lần sửa. Lỗi: ${reValidation.errors.join('; ')}`);
        }

        return repairedPlan;
    }
}
