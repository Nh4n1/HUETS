export const redemptionConfig = {
    activationTtlMs: 10 * 60 * 1000,
    deviceSessionTtlMs: 30 * 24 * 60 * 60 * 1000,
    redemptionSessionTtlMs: 5 * 60 * 1000,
    verificationTokenTtlSeconds: 60,
    deviceCookieName: 'huetrip_device_session',
    secureCookie: process.env.NODE_ENV === 'production',
} as const;
