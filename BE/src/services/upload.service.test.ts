import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { assertPublicIdInUploadFolder, getUploadSignature, validateCloudinaryResult } from './upload.service.ts';

const CLOUD_NAME = 'test-cloud';
const API_KEY = 'test-api-key';
const API_SECRET = 'test-api-secret';
const UPLOAD_FOLDER = 'location-images';

describe('getUploadSignature', () => {
    beforeEach(() => {
        process.env.CLOUDINARY_CLOUD_NAME = CLOUD_NAME;
        process.env.CLOUDINARY_API_KEY = API_KEY;
        process.env.CLOUDINARY_API_SECRET = API_SECRET;
        process.env.CLOUDINARY_UPLOAD_FOLDER = UPLOAD_FOLDER;
    });

    it('returns a signature matching Cloudinary\'s signing algorithm', () => {
        const result = getUploadSignature();

        expect(result.cloudName).toBe(CLOUD_NAME);
        expect(result.apiKey).toBe(API_KEY);
        expect(result.folder).toBe(UPLOAD_FOLDER);
        expect(result.allowedFormats).toBe('jpg,jpeg,png,webp');

        // Cloudinary signs `sha1(sorted "key=value" params joined by "&" + api_secret)`.
        const expectedSignature = createHash('sha1')
            .update(`allowed_formats=${result.allowedFormats}&folder=${result.folder}&timestamp=${result.timestamp}${API_SECRET}`)
            .digest('hex');
        expect(result.signature).toBe(expectedSignature);
    });

    it('throws when Cloudinary credentials are not configured', () => {
        delete process.env.CLOUDINARY_CLOUD_NAME;
        expect(() => getUploadSignature()).toThrow('Missing Cloudinary configuration');
    });
});

describe('validateCloudinaryResult', () => {
    const validResult = {
        secureUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v1/${UPLOAD_FOLDER}/abc.jpg`,
        publicId: `${UPLOAD_FOLDER}/abc`,
        bytes: 1024,
        format: 'jpg',
    };

    it('accepts a well-formed Cloudinary result', () => {
        const result = validateCloudinaryResult(validResult, CLOUD_NAME, UPLOAD_FOLDER);
        expect(result).toEqual({
            secureUrl: validResult.secureUrl,
            publicId: validResult.publicId,
            bytes: validResult.bytes,
            mimeType: 'image/jpeg',
        });
    });

    it('rejects a secureUrl from a different Cloudinary account', () => {
        expect(() => validateCloudinaryResult(
            { ...validResult, secureUrl: `https://res.cloudinary.com/other-cloud/image/upload/v1/${UPLOAD_FOLDER}/abc.jpg` },
            CLOUD_NAME,
            UPLOAD_FOLDER,
        )).toThrow('Cloudinary của hệ thống');
    });

    it('rejects a publicId outside the configured upload folder', () => {
        expect(() => validateCloudinaryResult(
            { ...validResult, publicId: 'other-folder/abc' },
            CLOUD_NAME,
            UPLOAD_FOLDER,
        )).toThrow('publicId');
    });

    it('rejects an unsupported format', () => {
        expect(() => validateCloudinaryResult(
            { ...validResult, format: 'gif' },
            CLOUD_NAME,
            UPLOAD_FOLDER,
        )).toThrow('JPG/JPEG, PNG hoặc WebP');
    });

    it('rejects a file that exceeds the max size', () => {
        expect(() => validateCloudinaryResult(
            { ...validResult, bytes: 6 * 1024 * 1024 },
            CLOUD_NAME,
            UPLOAD_FOLDER,
        )).toThrow('5 MB');
    });

    it('rejects a non-positive byte count', () => {
        expect(() => validateCloudinaryResult(
            { ...validResult, bytes: 0 },
            CLOUD_NAME,
            UPLOAD_FOLDER,
        )).toThrow('5 MB');
    });
});

describe('assertPublicIdInUploadFolder', () => {
    it('accepts a publicId inside the configured folder', () => {
        expect(() => assertPublicIdInUploadFolder(`${UPLOAD_FOLDER}/abc`, UPLOAD_FOLDER)).not.toThrow();
    });

    it('rejects a publicId outside the configured folder', () => {
        expect(() => assertPublicIdInUploadFolder('other-folder/abc', UPLOAD_FOLDER)).toThrow('publicId');
    });

    it('rejects a non-string publicId', () => {
        expect(() => assertPublicIdInUploadFolder(undefined, UPLOAD_FOLDER)).toThrow('publicId');
    });
});
