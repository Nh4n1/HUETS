import mongoose from 'mongoose';
import { signLocationImageAssetToken } from '../../helpers/locationAssetToken.helper.ts';

const [userId, url, publicId] = process.argv.slice(2);

if (!userId || !mongoose.isValidObjectId(userId) || !url) {
    console.error(
        'Usage: npm run dev:location-image-token -- <userId> <https-image-url> [publicId]',
    );
    process.exitCode = 1;
} else {
    try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('Only HTTP(S) image URLs are supported.');
        }

        const assetToken = signLocationImageAssetToken({
            sub: userId,
            url,
            ...(publicId ? { publicId } : {}),
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
        });
        console.log(assetToken);
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
