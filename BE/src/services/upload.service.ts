import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { locationImageUploadConfig } from '../config/config.upload.ts';
import { signLocationImageAssetToken } from '../helpers/locationAssetToken.helper.ts';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';

type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

const imageTypeBySignature = (buffer: Buffer): SupportedImageMimeType | undefined => {
    if (
        buffer.length >= 3
        && buffer[0] === 0xff
        && buffer[1] === 0xd8
        && buffer[2] === 0xff
    ) {
        return 'image/jpeg';
    }
    if (
        buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
        return 'image/png';
    }
    if (
        buffer.length >= 12
        && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return 'image/webp';
    }
    return undefined;
};

const extensionByMimeType: Record<SupportedImageMimeType, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

const validatePublicBaseUrl = (rawBaseUrl: string) => {
    try {
        const baseUrl = new URL(rawBaseUrl);
        if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error();
        return baseUrl.origin;
    } catch {
        throw new ApiError(500, 'VALIDATION_ERROR', 'PUBLIC_BASE_URL không hợp lệ.');
    }
};

export const uploadLocationImages = async (
    files: Express.Multer.File[],
    actorId: string,
    requestBaseUrl: string,
) => {
    if (files.length < 1 || files.length > locationImageUploadConfig.maxFiles) {
        throw new ApiError(422, 'INVALID_IMAGE_COUNT', 'Mỗi lần phải tải lên từ 1 đến 5 ảnh.');
    }

    const user = await User.findById(actorId).select({ status: 1 }).lean();
    if (!user) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Tài khoản không còn tồn tại.');
    }
    if (user.status === 'locked') {
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
    }

    const totalSizeBytes = files.reduce((total, file) => total + file.size, 0);
    if (totalSizeBytes > locationImageUploadConfig.maxTotalSizeBytes) {
        throw new ApiError(422, 'INVALID_IMAGE_SIZE', 'Tổng dung lượng ảnh không được vượt quá 20 MB.');
    }

    const validatedFiles = files.map((file) => {
        const detectedMimeType = imageTypeBySignature(file.buffer);
        if (!detectedMimeType || detectedMimeType !== file.mimetype.toLowerCase()) {
            throw new ApiError(
                422,
                'INVALID_IMAGE_TYPE',
                'Nội dung file không khớp định dạng JPG/JPEG, PNG hoặc WebP được hỗ trợ.',
            );
        }
        return { file, mimeType: detectedMimeType };
    });

    const publicBaseUrl = validatePublicBaseUrl(
        locationImageUploadConfig.publicBaseUrl ?? requestBaseUrl,
    );
    const expiresAt = new Date(
        Date.now() + locationImageUploadConfig.assetTokenExpiresInSeconds * 1000,
    );
    const pendingAssets = validatedFiles.map(({ file, mimeType }) => {
        const id = randomUUID();
        const fileName = `${id}.${extensionByMimeType[mimeType]}`;
        const publicId = `location-images/${id}`;
        const previewUrl = new URL(
            `${locationImageUploadConfig.publicPath}/${fileName}`,
            `${publicBaseUrl}/`,
        ).toString();

        return {
            file,
            mimeType,
            filePath: join(locationImageUploadConfig.storageDirectory, fileName),
            publicId,
            previewUrl,
        };
    });

    await mkdir(locationImageUploadConfig.storageDirectory, { recursive: true });
    const writtenFilePaths: string[] = [];

    try {
        for (const asset of pendingAssets) {
            await writeFile(asset.filePath, asset.file.buffer, { flag: 'wx' });
            writtenFilePaths.push(asset.filePath);
        }
    } catch (error) {
        await Promise.allSettled(writtenFilePaths.map((filePath) => unlink(filePath)));
        throw error;
    }

    const assets = pendingAssets.map(({ file, mimeType, publicId, previewUrl }) => ({
        assetToken: signLocationImageAssetToken(
            {
                sub: actorId,
                url: previewUrl,
                publicId,
                mimeType,
                sizeBytes: file.size,
            },
            locationImageUploadConfig.assetTokenExpiresInSeconds,
        ),
        previewUrl,
        expiresAt: expiresAt.toISOString(),
    }));

    return { assets };
};
