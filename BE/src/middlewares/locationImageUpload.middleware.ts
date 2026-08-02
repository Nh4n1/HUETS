import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { locationImageUploadConfig } from '../config/config.upload.ts';
import { ApiError } from '../utils/apiError.ts';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: locationImageUploadConfig.maxFiles,
        fileSize: locationImageUploadConfig.maxFileSizeBytes,
    },
    fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype.toLowerCase())) {
            return callback(new ApiError(
                422,
                'INVALID_IMAGE_TYPE',
                'Ảnh chỉ hỗ trợ định dạng JPG/JPEG, PNG hoặc WebP.',
            ));
        }
        return callback(null, true);
    },
});

const toApiError = (error: multer.MulterError) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
        return new ApiError(422, 'INVALID_IMAGE_SIZE', 'Mỗi ảnh không được vượt quá 5 MB.');
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
        return new ApiError(422, 'INVALID_IMAGE_COUNT', 'Mỗi lần chỉ được tải lên từ 1 đến 5 ảnh.');
    }
    return new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu upload ảnh không hợp lệ.');
};

export const parseLocationImages = (req: Request, res: Response, next: NextFunction) => {
    upload.array(locationImageUploadConfig.fieldName, locationImageUploadConfig.maxFiles)(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError) return next(toApiError(error));
        return next(error);
    });
};
