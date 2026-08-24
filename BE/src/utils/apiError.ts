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
    | 'CATEGORY_CODE_ALREADY_EXISTS'
    | 'TAG_GROUP_CODE_ALREADY_EXISTS'
    | 'TAG_CODE_ALREADY_EXISTS'
    | 'RECOMMENDED_TAG_NOT_ALLOWED'
    | 'CATEGORY_IN_USE'
    | 'TAG_GROUP_IN_USE'
    | 'TAG_IN_USE'
    | 'CATEGORY_TAG_MAPPING_IN_USE'
    | 'INVALID_SEARCH_QUERY'
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
    | 'INVALID_STATUS_TRANSITION'
    | 'MODERATOR_CAN_ONLY_EDIT_PENDING'
    | 'NO_CHANGES'
    | 'STALE_RESOURCE'
    | 'BOOKMARK_ALREADY_EXISTS'
    | 'BOOKMARK_NOT_FOUND'
    | 'BOOKMARK_TARGET_UNAVAILABLE'
    | 'CANNOT_LOCK_SELF'
    | 'CANNOT_MANAGE_SELF'
    | 'CANNOT_MANAGE_ADMIN'
    | 'CONFLICT'
    | 'REPORT_ALREADY_EXISTS'
    | 'REPORT_NOT_FOUND'
    | 'CANNOT_REPORT_OWN_CONTENT'
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
