import { describe, expect, it } from 'vitest';
import {
    signFeedbackImageAssetToken,
    signLocationImageAssetToken,
    signReportImageAssetToken,
    verifyFeedbackImageAssetToken,
    verifyReportImageAssetToken,
} from './locationAssetToken.helper.ts';

const asset = {
    sub: 'user-1',
    url: 'https://res.cloudinary.com/demo/image/upload/huetrip/example.png',
    publicId: 'huetrip/example',
    mimeType: 'image/png' as const,
    sizeBytes: 1024,
};

describe('feedback image asset token', () => {
    it('round-trips a feedback-purpose asset', () => {
        expect(verifyFeedbackImageAssetToken(signFeedbackImageAssetToken(asset))).toMatchObject(asset);
    });

    it('rejects a location-purpose asset', () => {
        expect(() => verifyFeedbackImageAssetToken(signLocationImageAssetToken(asset))).toThrow();
    });
});

describe('report image asset token', () => {
    it('round-trips only a report-purpose asset', () => {
        expect(verifyReportImageAssetToken(signReportImageAssetToken(asset))).toMatchObject(asset);
        expect(() => verifyReportImageAssetToken(signLocationImageAssetToken(asset))).toThrow();
        expect(() => verifyReportImageAssetToken(signFeedbackImageAssetToken(asset))).toThrow();
    });
});
