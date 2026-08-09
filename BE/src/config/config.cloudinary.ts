import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export interface CloudinaryConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadFolder: string;
}

// Read lazily (not at import time) so the server can boot before Cloudinary
// credentials are configured; only the upload endpoints need them.
export const getCloudinaryConfig = (): CloudinaryConfig => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error(
            'Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
        );
    }

    return {
        cloudName,
        apiKey,
        apiSecret,
        uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'location-images',
    };
};
