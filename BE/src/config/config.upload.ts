import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ quiet: true });

const configuredStorageDirectory = process.env.LOCATION_IMAGE_STORAGE_DIR?.trim();
const configuredPublicBaseUrl = process.env.PUBLIC_BASE_URL?.trim();

export const locationImageUploadConfig = {
    fieldName: 'images',
    maxFiles: 5,
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxTotalSizeBytes: 20 * 1024 * 1024,
    assetTokenExpiresInSeconds: 30 * 60,
    publicPath: '/uploads/location-images',
    storageDirectory: configuredStorageDirectory
        ? resolve(configuredStorageDirectory)
        : resolve(process.cwd(), 'storage', 'location-images'),
    publicBaseUrl: configuredPublicBaseUrl
        ? configuredPublicBaseUrl.replace(/\/$/, '')
        : undefined,
} as const;
