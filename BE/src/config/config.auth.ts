import dotenv from 'dotenv';
dotenv.config();

const config = {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    passwordResetTokenExpiresInMs: 60 * 60 * 1000, // 1 hour
};

export default config;
