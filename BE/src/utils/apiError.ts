export type ApiErrorCode =
    | 'VALIDATION_ERROR'
    | 'EMAIL_ALREADY_EXISTS'
    | 'INVALID_EMAIL'
    | 'PASSWORD_CONFIRMATION_MISMATCH'
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'INVALID_REFRESH_TOKEN'
    | 'INVALID_RESET_TOKEN'
    | 'INVALID_CATEGORY_TAG_COMBINATION'
    | 'INVALID_SEARCH_PLAN'
    | 'RATE_LIMITED'
    | 'TOO_MANY_TAGS'
    | 'INVALID_OPENING_HOURS'
    | 'INVALID_WARD'
    | 'INVALID_IMAGE_COUNT'
    | 'INVALID_IMAGE_TYPE'
    | 'INVALID_IMAGE_SIZE'
    | 'INVALID_IMAGE_ASSET_TOKEN'
    | 'INVALID_COORDINATES'
    | 'INVALID_ALIAS'
    | 'STALE_RESOURCE'
    | 'BOOKMARK_ALREADY_EXISTS'
    | 'BOOKMARK_NOT_FOUND'
    | 'CANNOT_LOCK_SELF'
    | 'CONFLICT'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND';

export class ApiError extends Error {
    statusCode: number;
    code: ApiErrorCode;
    details?: Record<string, unknown>;

    constructor(statusCode: number, code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        if (details !== undefined) {
            this.details = details;
        }
        Error.captureStackTrace(this, this.constructor);
    }
}
