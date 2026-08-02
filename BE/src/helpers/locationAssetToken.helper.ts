import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const LOCATION_IMAGE_TYPE = 'location_image';
const locationAssetTokenSecret = process.env.LOCATION_ASSET_TOKEN_SECRET || 'dev_location_asset_secret_change_me';

export interface LocationImageAssetPayload {
    sub: string;
    type: typeof LOCATION_IMAGE_TYPE;
    url: string;
    publicId?: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
}

export const signLocationImageAssetToken = (
    payload: Omit<LocationImageAssetPayload, 'type'>,
    expiresIn = '30m',
) => jwt.sign(
    { ...payload, type: LOCATION_IMAGE_TYPE },
    locationAssetTokenSecret,
    { expiresIn } as SignOptions,
);

export const verifyLocationImageAssetToken = (token: string): LocationImageAssetPayload => {
    const payload = jwt.verify(token, locationAssetTokenSecret) as Partial<LocationImageAssetPayload>;

    if (
        payload.type !== LOCATION_IMAGE_TYPE
        || typeof payload.sub !== 'string'
        || typeof payload.url !== 'string'
        || !['image/jpeg', 'image/png', 'image/webp'].includes(payload.mimeType ?? '')
        || typeof payload.sizeBytes !== 'number'
        || !Number.isFinite(payload.sizeBytes)
    ) {
        throw new Error('Invalid location image asset token payload.');
    }

    return payload as LocationImageAssetPayload;
};
