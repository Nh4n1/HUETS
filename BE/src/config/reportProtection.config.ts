import dotenv from 'dotenv';

dotenv.config();

const positiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const reportProtectionConfig = {
    windowMs: positiveInteger(process.env.REPORT_RATE_LIMIT_WINDOW_MS, 15 * 60_000),
    maxRequests: positiveInteger(process.env.REPORT_RATE_LIMIT_MAX, 20),
    imageUploadWindowMs: positiveInteger(process.env.REPORT_IMAGE_UPLOAD_RATE_LIMIT_WINDOW_MS, 60 * 60_000),
    imageUploadMaxRequests: positiveInteger(process.env.REPORT_IMAGE_UPLOAD_RATE_LIMIT_MAX, 20),
};
