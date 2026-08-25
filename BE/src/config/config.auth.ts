import dotenv from 'dotenv';
dotenv.config();

const config = {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    passwordResetTokenExpiresInMs: 60 * 60 * 1000, // 1 hour
};

export const REGISTRATION_VERIFICATION = {
    OTP_TTL_MINUTES: 10,
    RESEND_COOLDOWN_SECONDS: 60,
    MAX_ATTEMPTS: 5,
    MAX_RESENDS: 5,
} as const;

export default config;
