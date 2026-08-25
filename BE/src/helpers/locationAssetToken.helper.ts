import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const LOCATION_IMAGE_TYPE = 'location_image';
const FEEDBACK_IMAGE_TYPE = 'feedback_image';
const REPORT_IMAGE_TYPE = 'report_image';
const locationAssetTokenSecret = process.env.LOCATION_ASSET_TOKEN_SECRET || 'dev_location_asset_secret_change_me';

export interface LocationImageAssetPayload {
    sub: string;
    type: typeof LOCATION_IMAGE_TYPE;
    url: string;
    publicId?: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
}

export interface FeedbackImageAssetPayload extends Omit<LocationImageAssetPayload, 'type'> {
    type: typeof FEEDBACK_IMAGE_TYPE;
}

export interface ReportImageAssetPayload extends Omit<LocationImageAssetPayload, 'type'> {
    type: typeof REPORT_IMAGE_TYPE;
}

export const signLocationImageAssetToken = (
    payload: Omit<LocationImageAssetPayload, 'type'>,
    expiresIn: SignOptions['expiresIn'] = '30m',
) => jwt.sign(
    { ...payload, type: LOCATION_IMAGE_TYPE },
    locationAssetTokenSecret,
    { expiresIn },
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

export const signFeedbackImageAssetToken = (
    payload: Omit<FeedbackImageAssetPayload, 'type'>,
    expiresIn: SignOptions['expiresIn'] = '30m',
) => jwt.sign(
    { ...payload, type: FEEDBACK_IMAGE_TYPE },
    locationAssetTokenSecret,
    { expiresIn },
);

export const verifyFeedbackImageAssetToken = (token: string): FeedbackImageAssetPayload => {
    const payload = jwt.verify(token, locationAssetTokenSecret) as Partial<FeedbackImageAssetPayload>;
    if (
        payload.type !== FEEDBACK_IMAGE_TYPE
        || typeof payload.sub !== 'string'
        || typeof payload.url !== 'string'
        || !['image/jpeg', 'image/png', 'image/webp'].includes(payload.mimeType ?? '')
        || typeof payload.sizeBytes !== 'number'
        || !Number.isFinite(payload.sizeBytes)
    ) {
        throw new Error('Invalid feedback image asset token payload.');
    }
    return payload as FeedbackImageAssetPayload;
};

export const signReportImageAssetToken = (
    payload: Omit<ReportImageAssetPayload, 'type'>,
    expiresIn: SignOptions['expiresIn'] = '30m',
) => jwt.sign(
    { ...payload, type: REPORT_IMAGE_TYPE },
    locationAssetTokenSecret,
    { expiresIn },
);

export const verifyReportImageAssetToken = (token: string): ReportImageAssetPayload => {
    const payload = jwt.verify(token, locationAssetTokenSecret) as Partial<ReportImageAssetPayload>;
    if (
        payload.type !== REPORT_IMAGE_TYPE
        || typeof payload.sub !== 'string'
        || typeof payload.url !== 'string'
        || !['image/jpeg', 'image/png', 'image/webp'].includes(payload.mimeType ?? '')
        || typeof payload.sizeBytes !== 'number'
        || !Number.isFinite(payload.sizeBytes)
    ) {
        throw new Error('Invalid report image asset token payload.');
    }
    return payload as ReportImageAssetPayload;
};
