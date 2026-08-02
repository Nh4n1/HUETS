import cors from 'cors';
import type { CorsOptions } from 'cors';
import { allowedClientOrigins } from '../config/config.cors.ts';
import { ApiError } from '../utils/apiError.ts';

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        // Requests from tools/server-to-server clients do not include Origin.
        if (!origin || allowedClientOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new ApiError(
            403,
            'FORBIDDEN',
            'Origin không được phép truy cập API.',
        ));
    },
    credentials: true,
};

export const corsMiddleware = cors(corsOptions);
