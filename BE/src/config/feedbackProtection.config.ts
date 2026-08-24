import dotenv from 'dotenv';

dotenv.config();

const positiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const feedbackProtectionConfig = {
    windowMs: positiveInteger(process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS, 60 * 60_000),
    authenticatedMaxRequests: positiveInteger(process.env.FEEDBACK_AUTH_RATE_LIMIT_MAX, 10),
    guestMaxRequests: positiveInteger(process.env.FEEDBACK_GUEST_RATE_LIMIT_MAX, 5),
};
