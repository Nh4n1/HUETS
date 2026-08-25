import crypto from 'crypto';

export const generateSixDigitOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
