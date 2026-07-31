import type { Response } from 'express';

export const sendSuccess = (res: Response, statusCode: number, data: unknown, meta?: Record<string, unknown>) => {
    if (meta) {
        return res.status(statusCode).json({ data, meta });
    }
    return res.status(statusCode).json(data);
};
