export type ApiErrorCode =
    | 'VALIDATION_ERROR'
    | 'EMAIL_ALREADY_EXISTS'
    | 'INVALID_EMAIL'
    | 'PASSWORD_CONFIRMATION_MISMATCH'
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_LOCKED'
    | 'INVALID_REFRESH_TOKEN'
    | 'INVALID_RESET_TOKEN'
    | 'UNAUTHORIZED'
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
