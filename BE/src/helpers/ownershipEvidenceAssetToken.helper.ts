import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

const OWNERSHIP_EVIDENCE_TYPE = 'ownership_evidence';
const assetTokenSecret = process.env.LOCATION_ASSET_TOKEN_SECRET || 'dev_location_asset_secret_change_me';

export interface OwnershipEvidenceAssetPayload {
    sub: string;
    type: typeof OWNERSHIP_EVIDENCE_TYPE;
    url: string;
    publicId?: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
}

export const signOwnershipEvidenceAssetToken = (
    payload: Omit<OwnershipEvidenceAssetPayload, 'type'>,
    expiresIn: SignOptions['expiresIn'] = '30m',
) => jwt.sign({ ...payload, type: OWNERSHIP_EVIDENCE_TYPE }, assetTokenSecret, { expiresIn });

export const verifyOwnershipEvidenceAssetToken = (token: string): OwnershipEvidenceAssetPayload => {
    const payload = jwt.verify(token, assetTokenSecret) as Partial<OwnershipEvidenceAssetPayload>;
    if (
        payload.type !== OWNERSHIP_EVIDENCE_TYPE
        || typeof payload.sub !== 'string'
        || typeof payload.url !== 'string'
        || !['image/jpeg', 'image/png', 'image/webp'].includes(payload.mimeType ?? '')
        || typeof payload.sizeBytes !== 'number'
        || !Number.isFinite(payload.sizeBytes)
    ) {
        throw new Error('Invalid ownership evidence asset token payload.');
    }
    return payload as OwnershipEvidenceAssetPayload;
};
