import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as locationSearchService from '../services/locationSearch.service.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendSuccess } from '../utils/response.ts';

export const searchLocations = asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await locationSearchService.searchLocations(req.body);

        if (process.env.NODE_ENV !== 'prod') {
            console.info('[location-search]', result.debug);
        }

        return sendSuccess(res, 200, result.data, result.meta);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ApiError(
                400,
                'VALIDATION_ERROR',
                'Nội dung tìm kiếm không hợp lệ.',
                { fields: error.flatten().fieldErrors },
            );
        }

        throw error;
    }
});

export const executeLocationSearch = asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await locationSearchService.executeLocationSearch(req.body);
        return sendSuccess(res, 200, result.data, result.meta);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Tiêu chí tìm kiếm không hợp lệ.', {
                fields: error.flatten().fieldErrors,
            });
        }
        throw error;
    }
});
