import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig } from '../config/config.cloudinary.ts';
import { locationImageUploadConfig } from '../config/config.upload.ts';
import { signFeedbackImageAssetToken, signLocationImageAssetToken, signReportImageAssetToken } from '../helpers/locationAssetToken.helper.ts';
import { signOwnershipEvidenceAssetToken } from '../helpers/ownershipEvidenceAssetToken.helper.ts';
import Feedback from '../models/feedback.model.ts';
import Location from '../models/location.model.ts';
import LocationOwnership from '../models/locationOwnership.model.ts';
import Report from '../models/report.model.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

type SupportedImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp';
const allowedFormats: SupportedImageFormat[] = ['jpg', 'jpeg', 'png', 'webp'];
const formatToMimeType: Record<SupportedImageFormat, 'image/jpeg' | 'image/png' | 'image/webp'> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

export interface UploadSignature {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    allowedFormats: string;
    signature: string;
}

export const getUploadSignature = (): UploadSignature => {
    const config = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
        timestamp,
        folder: config.uploadFolder,
        allowed_formats: allowedFormats.join(','),
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, config.apiSecret);

    return {
        cloudName: config.cloudName,
        apiKey: config.apiKey,
        timestamp,
        folder: config.uploadFolder,
        allowedFormats: paramsToSign.allowed_formats,
        signature,
    };
};

// Shared guard so a caller can only ever reference assets under our own upload folder.
export function assertPublicIdInUploadFolder(publicId: unknown, uploadFolder: string): asserts publicId is string {
    if (typeof publicId !== 'string' || publicId.trim().length === 0 || !publicId.startsWith(`${uploadFolder}/`)) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'publicId của ảnh không hợp lệ.');
    }
}

// Best-effort cleanup for images uploaded to Cloudinary but never attached to a location
// (e.g. the admin form failed/aborted after upload but before createLocation succeeded).
// Cloudinary's own secure_url embeds the publicId, so it is public information —
// callers must never be trusted on ownership alone; refuse anything already in use.
export const deleteUploadedImage = async (rawPublicId: unknown) => {
    const config = getCloudinaryConfig();
    assertPublicIdInUploadFolder(rawPublicId, config.uploadFolder);

    const [isAttachedToLocation, isAttachedToFeedback, isAttachedToReport, isAttachedToOwnership] = await Promise.all([
        Location.exists({ 'images.publicId': rawPublicId }),
        Feedback.exists({ 'images.publicId': rawPublicId }),
        Report.exists({ 'evidenceImages.publicId': rawPublicId }),
        LocationOwnership.exists({ 'evidenceImages.publicId': rawPublicId }),
    ]);
    if (isAttachedToLocation || isAttachedToFeedback || isAttachedToReport || isAttachedToOwnership) {
        throw new ApiError(403, 'FORBIDDEN', 'Ảnh đã được gắn vào nội dung và không thể xoá qua API cleanup.');
    }

    // The Cloudinary SDK's destroy() has no per-call credential override, so configure
    // it globally right before the call using our lazily-read config.
    cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
    });
    await cloudinary.uploader.destroy(rawPublicId);
};

export interface CloudinaryUploadResultInput {
    secureUrl?: unknown;
    publicId?: unknown;
    bytes?: unknown;
    format?: unknown;
}

export const validateCloudinaryResult = (rawResult: unknown, cloudName: string, uploadFolder: string) => {
    if (!rawResult || typeof rawResult !== 'object') {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Kết quả tải ảnh lên Cloudinary không hợp lệ.');
    }
    const result = rawResult as CloudinaryUploadResultInput;

    if (typeof result.secureUrl !== 'string') {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Kết quả tải ảnh lên Cloudinary không hợp lệ.');
    }
    let secureUrl: URL;
    try {
        secureUrl = new URL(result.secureUrl);
    } catch {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Kết quả tải ảnh lên Cloudinary không hợp lệ.');
    }
    if (
        secureUrl.protocol !== 'https:'
        || secureUrl.hostname !== 'res.cloudinary.com'
        || !secureUrl.pathname.startsWith(`/${cloudName}/`)
    ) {
        throw new ApiError(422, 'INVALID_IMAGE_ASSET_TOKEN', 'Ảnh phải được tải lên từ Cloudinary của hệ thống.');
    }

    assertPublicIdInUploadFolder(result.publicId, uploadFolder);

    if (
        typeof result.format !== 'string'
        || !allowedFormats.includes(result.format.toLowerCase() as SupportedImageFormat)
    ) {
        throw new ApiError(422, 'INVALID_IMAGE_TYPE', 'Ảnh chỉ hỗ trợ định dạng JPG/JPEG, PNG hoặc WebP.');
    }

    if (
        typeof result.bytes !== 'number'
        || !Number.isFinite(result.bytes)
        || result.bytes <= 0
        || result.bytes > locationImageUploadConfig.maxFileSizeBytes
    ) {
        throw new ApiError(422, 'INVALID_IMAGE_SIZE', 'Mỗi ảnh không được vượt quá 5 MB.');
    }

    return {
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        bytes: result.bytes,
        mimeType: formatToMimeType[result.format.toLowerCase() as SupportedImageFormat],
    };
};

export const confirmLocationImageUploads = async (results: unknown, actorId: string) => {
    if (!Array.isArray(results) || results.length < 1 || results.length > locationImageUploadConfig.maxFiles) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Mỗi lần phải tải lên từ 1 đến 5 ảnh.');
    }

    const user = await User.findById(actorId).select({ status: 1 }).lean();
    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    const config = getCloudinaryConfig();
    const validatedResults = results.map(
        (result) => validateCloudinaryResult(result, config.cloudName, config.uploadFolder),
    );

    const totalSizeBytes = validatedResults.reduce((total, result) => total + result.bytes, 0);
    if (totalSizeBytes > locationImageUploadConfig.maxTotalSizeBytes) {
        throw new ApiError(422, 'INVALID_IMAGE_SIZE', 'Tổng dung lượng ảnh không được vượt quá 20 MB.');
    }

    const expiresAt = new Date(
        Date.now() + locationImageUploadConfig.assetTokenExpiresInSeconds * 1000,
    );
    const assets = validatedResults.map((result) => ({
        assetToken: signLocationImageAssetToken(
            {
                sub: actorId,
                url: result.secureUrl,
                publicId: result.publicId,
                mimeType: result.mimeType,
                sizeBytes: result.bytes,
            },
            locationImageUploadConfig.assetTokenExpiresInSeconds,
        ),
        previewUrl: result.secureUrl,
        expiresAt: expiresAt.toISOString(),
    }));

    return { assets };
};

export const deleteLocationImage = deleteUploadedImage;

export const confirmFeedbackImageUploads = async (results: unknown, actorId: string) => {
    if (!Array.isArray(results) || results.length < 1 || results.length > 3) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Mỗi lần phải tải lên từ 1 đến 3 ảnh góp ý.');
    }
    const user = await User.findById(actorId).select({ status: 1 }).lean();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    if (user.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');

    const config = getCloudinaryConfig();
    const validatedResults = results.map((result) => validateCloudinaryResult(result, config.cloudName, config.uploadFolder));
    const expiresIn = locationImageUploadConfig.assetTokenExpiresInSeconds;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
        assets: validatedResults.map((result) => ({
            assetToken: signFeedbackImageAssetToken({
                sub: actorId,
                url: result.secureUrl,
                publicId: result.publicId,
                mimeType: result.mimeType,
                sizeBytes: result.bytes,
            }, expiresIn),
            previewUrl: result.secureUrl,
            expiresAt,
        })),
    };
};

export const confirmReportImageUploads = async (results: unknown, actorId: string) => {
    if (!Array.isArray(results) || results.length < 1 || results.length > 3) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Mỗi lần phải tải lên từ 1 đến 3 ảnh chứng cứ.');
    }
    const user = await User.findById(actorId).select({ status: 1 }).lean();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    if (user.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');

    const config = getCloudinaryConfig();
    const validatedResults = results.map((result) => validateCloudinaryResult(result, config.cloudName, config.uploadFolder));
    const expiresIn = locationImageUploadConfig.assetTokenExpiresInSeconds;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
        assets: validatedResults.map((result) => ({
            assetToken: signReportImageAssetToken({
                sub: actorId,
                url: result.secureUrl,
                publicId: result.publicId,
                mimeType: result.mimeType,
                sizeBytes: result.bytes,
            }, expiresIn),
            previewUrl: result.secureUrl,
            expiresAt,
        })),
    };
};

export const confirmOwnershipEvidenceUploads = async (results: unknown, actorId: string) => {
    if (!Array.isArray(results) || results.length < 1 || results.length > locationImageUploadConfig.maxFiles) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Hồ sơ phải có từ 1 đến 5 ảnh bằng chứng.');
    }
    const user = await User.findById(actorId).select({ role: 1, status: 1 }).lean();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    if (user.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    if (user.role !== 'user') {
        throw new ApiError(403, 'FORBIDDEN', 'Tài khoản quản trị không thể gửi hồ sơ ownership.');
    }

    const config = getCloudinaryConfig();
    const validatedResults = results.map((result) => (
        validateCloudinaryResult(result, config.cloudName, config.uploadFolder)
    ));
    const totalSizeBytes = validatedResults.reduce((sum, result) => sum + result.bytes, 0);
    if (totalSizeBytes > locationImageUploadConfig.maxTotalSizeBytes) {
        throw new ApiError(422, 'INVALID_IMAGE_SIZE', 'Tổng dung lượng ảnh không được vượt quá 20 MB.');
    }

    const expiresIn = locationImageUploadConfig.assetTokenExpiresInSeconds;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
        assets: validatedResults.map((result) => ({
            assetToken: signOwnershipEvidenceAssetToken({
                sub: actorId,
                url: result.secureUrl,
                publicId: result.publicId,
                mimeType: result.mimeType,
                sizeBytes: result.bytes,
            }, expiresIn),
            previewUrl: result.secureUrl,
            expiresAt,
        })),
    };
};
