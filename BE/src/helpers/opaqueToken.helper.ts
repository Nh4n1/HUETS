import crypto from 'node:crypto';

const FRIENDLY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateOpaqueToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const hashOpaqueToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const generateFriendlyCode = (length: number, prefix = '') => {
    let value = '';
    while (value.length < length) {
        value += FRIENDLY_ALPHABET[crypto.randomInt(0, FRIENDLY_ALPHABET.length)];
    }
    return `${prefix}${value}`;
};

export const normalizeFriendlyCode = (value: unknown) => (
    typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
);
