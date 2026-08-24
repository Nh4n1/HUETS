import type { Request, Response } from 'express';
import * as feedbackService from '../services/feedback.service.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

export const createFeedback = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, 201, await feedbackService.createFeedback(req.body, req.user?.id)));
