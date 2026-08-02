import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const normalizeOrigin = (rawOrigin: string) => {
    try {
        const url = new URL(rawOrigin.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        return url.origin;
    } catch {
        throw new Error(`CLIENT_ORIGIN contains an invalid HTTP(S) origin: ${rawOrigin}`);
    }
};

const configuredOrigins = process.env.CLIENT_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const allowedClientOrigins = new Set(
    (configuredOrigins?.length ? configuredOrigins : ['http://localhost:5173'])
        .map(normalizeOrigin),
);
